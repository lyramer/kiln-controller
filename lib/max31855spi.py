#!/usr/bin/python
import time
import board
import busio
import digitalio
import logging
from adafruit_max31855 import MAX31855
spi = busio.SPI(board.SCK, MOSI=board.MOSI, MISO=board.MISO)
cs = digitalio.DigitalInOut(board.D17)

class MAX31855SPI(object):
    '''Python driver for [MAX38155 Cold-Junction Compensated Thermocouple-to-Digital Converter](http://www.maximintegrated.com/datasheet/index.mvp/id/7273)
     Requires:
     - adafruit's MAX31855 SPI-only device library

    '''
    def __init__(self, timeStep):
        self.max31855 = MAX31855(spi, cs)
        self.log = logging.getLogger(__name__)
        self.tries = 0
        self.maxTries = 10
        self.timeStep = timeStep
        self.interval = float(self.maxTries) / self.timeStep
        self.tempC = 0

    def get(self):
        '''Reads and returns current temp of thermocouple.'''

        try:
            self.tempC = self.max31855.temperature
        except:
            print("TC short to ground")
            
            
        return self.tempC


class MAX31855SPIError(Exception):
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return repr(self.value)
