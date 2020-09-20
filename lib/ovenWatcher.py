import threading,logging,json,time,datetime, jsonpickle
from pathlib import Path
from oven import Oven
log = logging.getLogger(__name__)

class OvenWatcher(threading.Thread):
    def __init__(self,oven):
        self.last_profile = None
        self.firingLog = {}
        self.lastLog = []
        self.started = None
        self.recording = False
        self.observers = []
        threading.Thread.__init__(self)
        self.daemon = True
        self.oven = oven
        self.start()

# FIXME - need to save runs of schedules in near-real-time
# FIXME - this will enable re-start in case of power outage
# FIXME - re-start also requires safety start (pausing at the beginning
# until a temp is reached)
# FIXME - re-start requires a time setting in minutes.  if power has been
# out more than N minutes, don't restart
# FIXME - this should not be done in the Watcher, but in the Oven class

    def run(self):
        while True:
            oven_state = self.oven.get_state()
           
            # record state for any new clients that join
            if oven_state.get("state") == Oven.STATE_RUNNING:

                # put the state record in the firing log
                activeSegment = oven_state["segment"]
                newEntry = LogEntry(oven_state)
                segLog = self.firingLog["segLog"][activeSegment]["data"]

                # but only if it doesn't exist already...
                if newEntry not in segLog:
                    self.firingLog["segLog"][activeSegment]["data"].append(LogEntry(oven_state))

                # this is the master log which the front-end uses to display
                self.lastLog.append(oven_state)
            else:
                self.recording = False
            self.notify_all(oven_state)
            time.sleep(self.oven.time_step)
   
   
    def lastlog_subset(self,maxpts=50):
        '''send about maxpts from lastlog by skipping unwanted data'''
        totalpts = len(self.lastLog)
        if (totalpts <= maxpts):
            return self.lastLog
        every_nth = int(totalpts / (maxpts - 1))
        return self.lastLog[::every_nth]


    def logNewSegment(self, segStartTime, segID, curTemp):
        self.firingLog["segLog"][segID] = {
            'segStartTime': segStartTime,
            'data': [],
            'segStartTemp': curTemp,
        }



    def record(self, profile):
        self.last_profile = profile
        self.lastLog = []
        self.started = datetime.datetime.now()
        self.recording = True
        curState = self.oven.get_state()

        print("\n\n STARTING RECORDING")

        # set up log file
        script_location = Path(__file__).absolute().parent
        fileName = self.started.strftime("%Y%m%d-%H%M") + ".json"
        logPath = script_location / 'logs' / fileName

        
        #we just turned on, add first state for nice graph
        self.lastLog.append(curState)

        # need to convert list of segments into a json friendly format
        curEntry = LogEntry(curState)

        # creating a firing log
        self.firingLog["profile"] = {
            'name': profile.name,
            'segments': profile.segments,
            'date': self.started.strftime("%B %d %Y"),
            'estDuration': profile.duration,
            'startTime': self.started.strftime("%H:%M"),
            'endTime': None,
        }

        self.firingLog["segLog"] = {}

        # initialize segment sections in the firing log data
        for seg in profile.segments:
            self.firingLog["segLog"][seg.id] = {"segStart": None, "data": []}
    

        # write the first entry
        self.firingLog["segLog"][0] = {
            'segStartTime': self.started,
            'data': [curEntry],
            'segStartTemp': curEntry.curTemp,
        }

        print("\n\nfiringLog")
        print(self.firingLog)

        firingLogJson = jsonpickle.encode(self.firingLog)

        # writing the log to a json file with the timestamp as a name
        with open(logPath, 'w+') as outfile:
            outfile.write(firingLogJson)




    def add_observer(self,observer):
        if self.last_profile:
            p = {
                "name": self.last_profile.name,
                "data": self.last_profile.segments, 
                "type" : "profile"
            }
        else:
            p = None
        
        backlog = {
            'type': "backlog",
            'profile': p,
            'log': self.lastlog_subset(),
            #'started': self.started
        }
        backlog_json = json.dumps(backlog)
        try:
            print (backlog_json)
            observer.send(backlog_json)
        except:
            log.error("Could not send backlog to new observer")
        
        self.observers.append(observer)


    # get a pared down log of just the entries for a single segment
    # over a specified time interval
    def getSegmentLog(self, segmentID, interval):

        # grab the entire log for the chosen segment
        segLog = sorted(list(self.firingLog["segLog"][segmentID]["data"]), key=lambda k: k.runtime)
        startTemp = self.firingLog["segLog"][segmentID]["segStartTemp"]
        segStart = self.firingLog["segLog"][segmentID]["segStartTime"]

        segLog = {
            'id': segmentID,
            'data': segLog,
            'segStart': segStart,
            'startTemp': startTemp,
        }


        # look at the most recent entry
        curEntry = segLog["data"][-1]

        # if the interval is shorter than the segment's current runtime
        # truncate the returned seglog to just those entries which fall within the timespan
        if (curEntry.runtime > interval):
            timespan = curEntry.runtime  - interval
            segLog["data"] = [entry for entry in segLog["data"] if entry.runtime >= timespan]
        
        return segLog
        


    # calculates target temp based on the temp from the entry closest
    # to the interval
    def getTargetTemperature(self, segmentID, curTemp, segStart):
        # define the interval (in seconds) that you want to look at for the change in temp
        interval = 600 # currently set to 10 min

        curSegment = self.last_profile.segments[segmentID]
        segmentLog = self.getSegmentLog(segmentID, interval)
        logStartTemp = segmentLog["startTemp"]
        targetRise = curSegment.rise / 3600
        timeElapsed = (datetime.datetime.now() - segStart).total_seconds()

        oldestEntry = segmentLog["data"][0]
        newestEntry = segmentLog["data"][-1]
        idealTemp = logStartTemp + (targetRise * timeElapsed)
        

        


        # calculate the different in temp from the most recent vs the oldest log entry that's within the timespan
        tempDelta = newestEntry.curTemp - oldestEntry.curTemp

        # since the actual time elapsed between the two log entries may differ from the idealized timespan,
        # best to calculate that too!
        timeDelta = newestEntry.runtime - oldestEntry.runtime

        # at the beginning the timeDelta will be 0 since the logs are too close together, so manual adjustment needed
        timeDelta = timeDelta if timeDelta > 0 else 1

        # since we define rise as degrees per hour, multiply by 3600 to get the temp delta per hour
        curDelta = (tempDelta / timeDelta) * 3600

        
        
        # if our current rise is under the maximum, or if the log is too short to get a good sense of rise
        newBestTarget = oldestEntry.curTemp + (targetRise * timeDelta)

        # if we're rising faster than our limit, slow down
        # get the ideal temperature for right now based on the temp data of 10 min ago + rise
        if curDelta > targetRise or curTemp > idealTemp:
            newBestTarget = idealTemp

        print("\n\nSeg Watcher")
        print("Time elapsed : " + str(timeElapsed))
        print("target Temp: " + str(newBestTarget))
        print("cur Temp: " + str(curTemp))

        print("Firing Log")
        print(self.firingLog)

        return newBestTarget




    def notify_all(self,message):
        message_json = json.dumps(message)
        log.debug("sending to %d clients: %s"%(len(self.observers),message_json))
        for wsock in self.observers:
            if wsock:
                try:
                    wsock.send(message_json)
                except:
                    log.error("could not write to socket %s"%wsock)
                    self.observers.remove(wsock)
            else:
                self.observers.remove(wsock)


class LogEntry():
    def __init__(self,oven_state):
        segment = oven_state["segmentID"] if "segmentID" in oven_state.keys() else oven_state["segment"]
        curTemp = oven_state["curTemp"] if "curTemp" in oven_state.keys() else oven_state["temperature"]
        targetTemp = oven_state["targetTemp"] if "targetTemp" in oven_state.keys() else oven_state["target"]
        ovenState = oven_state["ovenState"] if "ovenState" in oven_state.keys() else oven_state["state"]

        self.runtime = oven_state["runtime"]
        self.segmentID = segment
        self.curTemp = curTemp
        self.targetTemp = targetTemp
        self.ovenState = ovenState
        self.heat = oven_state["heat"]

    def __eq__(self, other):
        return self.runtime==other.runtime

    def __str__(self):
        return ('''
        LogEntry:
            runtime: {}
            segmentID: {}
            curTemp: {}
            targetTemp: {}
            ovenState: {}
            heat: {}
        '''.format(
                self.runtime,
                self.segmentID, 
                self.curTemp,
                self.targetTemp,
                self.ovenState,
                self.heat
            )    
        )

    def __hash__(self):
        return hash(self.runtime)

    def __repr__(self):
        return str(self)
    
    def toJSON(self):
        return json.dumps(self.__dict__)

