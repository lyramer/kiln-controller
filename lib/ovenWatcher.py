import threading,logging,json,time,datetime
from pathlib import Path
from oven import Oven
log = logging.getLogger(__name__)

class OvenWatcher(threading.Thread):
    def __init__(self,oven):
        self.last_profile = None
        self.firing_log = {}
        self.last_log = []
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
                self.last_log.append(oven_state)
            else:
                self.recording = False
            self.notify_all(oven_state)
            time.sleep(self.oven.time_step)
   
    def lastlog_subset(self,maxpts=50):
        '''send about maxpts from lastlog by skipping unwanted data'''
        totalpts = len(self.last_log)
        if (totalpts <= maxpts):
            return self.last_log
        every_nth = int(totalpts / (maxpts - 1))
        return self.last_log[::every_nth]

    def record(self, profile):
        self.last_profile = profile
        self.last_log = []
        self.started = datetime.datetime.now()
        script_location = Path(__file__).absolute().parent
        fileName = self.started.strftime("%Y%m%d-%H%M") + ".json"
        logPath = script_location / 'logs' / fileName
        print("logPath:" + str(logPath))
        self.recording = True
        #we just turned on, add first state for nice graph
        self.last_log.append(self.oven.get_state())

        # creating a json firing log
        self.firing_log["profile"] = {
            'name': profile.name,
            'segments': profile.segments,
            'date': self.started.strftime("%B %d %Y"),
            'startTime': self.started.strftime("%H %M"),
            'endTime': None,
        }
        
        self.firing_log["data"]  = self.last_log

        # writing the log to a json file with the timestamp as a name
        with open(logPath, 'w+') as outfile:
            outfile.write(json.dumps(self.firing_log, indent=4))

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

    def getSegmentLog(self, segmentID, interval):

        # grab the entire log for the chosen segment
        segLog = [entry for entry in self.last_log if entry['segment'] == segmentID]

        curState = self.oven.get_state()

        # if the interval is longer than the segment's current runtime
        if (curState["runtime"] <= interval):
            return segLog
        # otherwise only grab the most recent entries that fall within the timespan
        else:
            timespan = curState["runtime"] - interval
            print("timespan: " + str(timespan))
            return [entry for entry in segLog if entry['runtime'] >= timespan]

    def getTargetTemperature(self, segmentID, curTemp):
        # define the interval (in seconds) that you want to look at for the change in temp
        interval = 600 # currently set to 10 min

        curSegment = self.last_profile.segments[segmentID]
        segmentLog = self.getSegmentLog(segmentID, interval)
        print("\ngetTargetTemperature: ")
        print("curSegment: " + str(curSegment))
        

        if len(segmentLog) > 1:

            # calculate the different in temp from the most recent vs the oldest log entry that's within the timespan
            tempDelta = segmentLog[-1]["temperature"] - segmentLog[0]["temperature"] 

            # since the actual time elapsed between the two log entries may differ from the idealized timespan,
            # best to calculate that too!
            timeDelta = segmentLog[-1]["runtime"] - segmentLog[0]["runtime"] 


            # since we define rise as degrees per hour, multiply by 3600 to get the temp delta per hour
            curDelta = (tempDelta / timeDelta) * 3600 if timeDelta > 0 else 0

            # if we're rising faster than our limit, slow down
            # get the ideal temperature for right now based on the temp data of 10 min ago + rise
            newBestTemperature = segmentLog[0]["temperature"] + (curSegment["rise"] / 3600) * timeDelta
            print("hypothetical temp: " + str(newBestTemperature))
            if curDelta > curSegment["rise"]:
                return newBestTemperature


        newBestTarget = (curSegment["rise"] / 3600) * interval
        print("curRise: " + str(curSegment["rise"]))
        print("new Target: " + str(newBestTarget + curTemp))
        return newBestTarget + curTemp




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
