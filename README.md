Kiln Controller
==========

Turns a Raspberry Pi into an inexpensive, web-enabled kiln controller.

## Features

  * easy to create new kiln schedules and edit / modify existing schedules
  * no limit to runtime - fire for days if you want
  * view status from multiple devices at once - computer, tablet etc
  * firing cost estimate
  * NIST-linearized conversion for accurate K type thermocouple readings
  * supports PID parameters you tune to your kiln
  * monitors temperature in kiln after schedule has ended
  * api for starting and stopping schedules

**Run Kiln Schedule**

![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/kiln-running.png)

**Edit Kiln Schedule**

![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/kiln-schedule.png)

## Hardware

### Parts

| Image | Hardware | Description |
| ------| -------- | ----------- |
| ![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/rpi.png) | [Raspberry Pi](https://www.adafruit.com/category/105) | Virtually any Raspberry Pi will work since only a few GPIO pins are being used. |
| ![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/max31855.png) | [MAX 31855](https://www.adafruit.com/product/269) | Thermocouple breakout board |
| ![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/k-type-thermocouple.png) | [K-Type Thermocouple](https://www.auberins.com/index.php?main_page=product_info&cPath=20_3&products_id=39) | Invest in a heavy duty, ceramic, k-type thermocouple designed for kilns |
| ![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/breadboard.png) | Breadboard | breadboard, ribbon cable, connector for pi's gpio pins & connecting wires |
| ![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/ssr.png) | Solid State Relay | Zero crossing, make sure it can handle the max current of your kiln. You only need one SSR, even if the kiln is 220V. Relays this big always require a heat sink. |
| ![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/ks-1018.png) | Electric Kiln | There are many old electric kilns on the market that don't have digital controls. You can pick one up on the used market cheaply.  This controller will work with 110V or 220V (pick a proper SSR). My kiln is a Skutt KS-1018. |

### Schematic

The pi has three gpio pins connected to the MAX31855 chip. D0 is configured as an input and CS and CLK are outputs. The signal that controls the solid state relay starts as a gpio output which drives a transistor acting as a switch in front of it. This transistor provides 5V and plenty of current to control the ssr. Since only four gpio pins are in use, any pi can be used for this project. See the [config](https://github.com/jbruce12000/kiln-controller/blob/master/config.py) file for gpio pin configuration. 

![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/schematic.png)

*Note: I tried to power my ssr directly using a gpio pin. The pin could not provide enough current (16ma max) to control my ssr. My ssr was rated at 25ma max current, and 3V minimum to switch so I figured it would work. YMMV.*

## Software 

### Raspbian

Download [NOOBs](https://www.raspberrypi.org/downloads/noobs/). Copy files to an SD card. Install raspbian on RPi using NOOBs.

    $ sudo apt-get install python-pip python-dev libevent-dev python-virtualenv
    $ git clone https://github.com/jbruce12000/kiln-controller.git
    $ cd kiln-controller
    $ virtualenv venv
    $ source venv/bin/activate
    $ pip install greenlet bottle gevent gevent-websocket

*Note: The above steps work on ubuntu if you prefer*

### Raspberry PI deployment

If you want to deploy the code on a PI for production:

    $ cd kiln-controller
    $ virtualenv venv
    $ source venv/bin/activate
    $ pip install RPi.GPIO

If you also want to use the in-kernel SPI drivers with a MAX31855 sensor:

    $ pip install Adafruit-MAX31855

## Configuration

All parameters are defined in config.py, just copy the example and review/change to your mind's content.

    $ cp config.py.EXAMPLE config.py

## Usage

### Server Startup

    $ source venv/bin/activate; ./kiln-controller.py

### Autostart Server onBoot
If you want the server to autostart on boot, run the following commands

    $ /home/pi/kiln-controller/start-on-boot

### Client Access

Click http://127.0.0.1:8081 for local development or the IP
of your PI and the port defined in config.py (default 8081).

### Simulation

Select a profile and click Start. If you do not have a raspberry pi connected
and configured, then your run will be simulated.  Simulations run at near real
time and kiln characteristics are defined in config.py.

## License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

## Support & Contact

Please use the issue tracker for project related issues.
If you're having trouble with hardware, I did too.  Here is a [troubleshooting guide](https://github.com/jbruce12000/kiln-controller/blob/master/docs/troubleshooting.md) I created for testing RPi gpio pins.
If you're having trouble setting PID values, I did too.  Here is a [PID Tuning Guide](https://github.com/jbruce12000/kiln-controller/blob/master/docs/pid_tuning.md)

## Origin
This project was originally forked from https://github.com/apollo-ng/picoReflow but has diverged a large amount.
