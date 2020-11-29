# Testing your thermocouple

If you want to just debug your thermocouple, 

1. Create a new directory in your raspberry pi and navigate to it

    $ mkdir thermocouple_test
    $ cd thermocouple_test

2. [Set up SPI](https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-spi)

    $ sudo raspi-config

Select **Interfacing Options** and hit Enter. Then select **SPI** and hit Enter again. Enable it by selecting **YES** and then hitting Enter. 

Reboot your Pi by running

    $ sudo shutdown -r now

This is a good time to make sure that you haven't set up your project to run automatically on boot. If you have, then you will need to type

    $ sudo systemctl disable kiln-controller

You can always set it up again later by following the corresponding step in the README.


3. Then, set up the virtualenv with python3. 

*If you haven't completed step 1 of the 'Installing the project on your Pi' in the README, then this won't work. Do that first.*

    $ virtualenv -p python3 venv
    $ source venv/bin/activate
    
3. Install the adafruit python MAX31855 driver
    
    $ pip install RPI.GPIO adafruit-blinka adafruit-circuitpython-max31855




