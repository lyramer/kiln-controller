import json

class Profile():
    def __init__(self, json_data):
        profile = json_data
        self.name = profile["name"]
        self.type = profile["type"]
        self.duration = profile["totalTime"]
        self.segments = sorted(profile["data"], key=lambda k: k['startTime'])


    def get_surrounding_points(self, time):
        prev_point = None
        next_point = None

        for i in range(len(self.segments)):
            if time < self.segments[i][0]:
                prev_point = self.segments[i-1]
                next_point = self.segments[i]
                break

        return (prev_point, next_point)

    def is_rising(self, time):
        (prev_point, next_point) = self.get_surrounding_points(time)
        if prev_point and next_point:
            return prev_point[1] < next_point[1]
        else:
            return False

    def get_target_temperature(self, segmentID, segTime):
        
        curSegment = self.segments[segmentID]

        # needs reworking
        print("curSegment minduration " + str(curSegment["minDuration"]))
        incl = float((curSegment["targetTemp"] + curSegment["startTemp"])/ curSegment["minDuration"])
        print("segTime: " + str(segTime))
        print("incl: " + str(incl))
        temp = (segTime * incl) + curSegment["startTemp"]

        # incl = float(next_point[1] - prev_point[1]) / float(next_point[0] - prev_point[0])
        # temp = prev_point[1] + (time - prev_point[0]) * incl
        return temp
