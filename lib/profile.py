import json

class Profile():
    def __init__(self, json_data):
        profile = json_data

        # sort and attach ID's to the segments
        segments = sorted(profile["data"], key=lambda k: k['startTime'])
        segments = [dict(seg, id=index) for index, seg in enumerate(segments)]

        self.name = profile["name"]
        self.type = profile["type"]
        self.duration = profile["totalTime"]
        self.segments = [Segment(seg) for seg in segments]



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


class Segment():
    def __init__(self, segInfo):
        self.id = int(segInfo["id"])
        self.startTime = segInfo["startTime"]
        self.startTemp = segInfo["startTemp"]
        self.targetTemp = segInfo["targetTemp"]
        self.rise = segInfo["rise"]
        self.minDuration = segInfo["minDuration"]
    
    def __eq__(self, other):
        return self.id == other.id
    
    def __str__(self):
        return ('''
        Segment %d:
            startTime: %d
            startTemp: %d
            targetTemp: %d
            rise: %d
            minDuration: %.2f minutes
        ''' % (self.id, self.startTime, self.startTemp, self.targetTemp, self.rise, self.minDuration / 60))

    def __repr__(self):
        return str(self)
