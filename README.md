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
  * api for starting and stopping at any point in a schedule

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
| ![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/ssr.png) | Solid State Relay | Zero crossing, make sure it can handle the max current of your kiln. Even if the kiln is 220V you can buy a single [3 Phase SSR](https://www.auberins.com/index.php?main_page=product_info&cPath=2_30&products_id=331). It's like having 3 SSRs in one.  Relays this big always require a heat sink. |
| ![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/ks-1018.png) | Electric Kiln | There are many old electric kilns on the market that don't have digital controls. You can pick one up on the used market cheaply.  This controller will work with 110V or 220V (pick a proper SSR). My kiln is a Skutt KS-1018. |

### Schematic

The pi has three gpio pins connected to the MAX31855 chip. D0 is configured as an input and CS and CLK are outputs. The signal that controls the solid state relay starts as a gpio output which drives a transistor acting as a switch in front of it. This transistor provides 5V and plenty of current to control the ssr. Since only four gpio pins are in use, any pi can be used for this project. See the [config](https://github.com/jbruce12000/kiln-controller/blob/master/config.py) file for gpio pin configuration.

My controller plugs into the wall, and the kiln plugs into the controller. 

**WARNING** This project involves high voltages and high currents. Please make sure that anything you build conforms to local electrical codes and aligns with industry best practices.

![Image](https://github.com/jbruce12000/kiln-controller/blob/master/public/assets/images/schematic.png)

*Note: I tried to power my ssr directly using a gpio pin, but it did not work. My ssr required 25ma to switch and rpi's gpio could only provide 16ma. YMMV.*

## Software 

### Setting Up Raspberry Pi OS

**Quick Version**
1. Install Raspberry Pi OS (formerly Raspbian)
2. Wire it up  according to the schematic (optional for now but...it won't be a kiln controller until you do)
3. Proceed to **Installing the project**


**Long Version**
If you're a first time Pi'er like me, you will find out that each Pi is a little different, but Sparkfun, Adafruit, and the official Raspberry Pi website all have great tutorials for what you need to get your particular board up and running wih a regular Raspberry Pi OS install, along with the cords and peripherals you need. A quick Google search will go a long way in guiding you through this. You can follow [this guide](https://projects.raspberrypi.org/en/projects/raspberry-pi-setting-up) and skip to the **Installing the project** section if you prefer a more visual format that's easier for beginners. This gives instructions for most Pi's except for the Zero W, which is what I had; [Sparkfun had a good rundown on what peripherals you need for the Zero W](https://learn.sparkfun.com/tutorials/getting-started-with-the-raspberry-pi-zero-wireless/all). 

1. Install the [Raspberry Pi Imager](https://www.raspberrypi.org/downloads/) on your computer. 

2. Get your microSD card out, plug it into your computer, and run the imager (or NOOBS) to install Raspberry Pi OS on it. 

3. This is a good point to get everything wired up using the schematic. 

*Note that most RPi's (except for the very cheap ones) already have resistors built into the board, so you may not need to install them on the GPIO pins per the schematic. Be sure to check for your particular model! If you don't happen to have resistors on hand, it is very worth checking, since it will save you from getting stuck at a roadblock that doesn't actually need to stop you. 

4. Put the microSD card into the slot on the Pi, and get your peripherals, internet, and power plugged in.  Boot the Pi up. If this is your first Pi project, congratulations! You should now have a working miniature computer. It will take a few minutes to set up the time and date the first time you start it up. Make sure you install the OS updates, but if you just installed the Raspberry Pi Imager and created the OS on the SD card from that, you shouldn't have any to install.

Another beginner's note: according to my RPi guru, RPi's thrive on being abruptly disconnected from power without ceremony or warning. I'm still cautious about unplugging during the middle of running an install (aka at any point during the install steps below), but rest assured that if you didn't bother wiring it up and finished the project install first because you're excited, or just waiting for soldering help, you can unplug it after the install without disrupting anything in order to get the wiring done. 

### Installing the project on your Pi

1. On your RPi, open the terminal. Run the following:

    $ sudo apt-get install python3-pip python3-dev python3-virtualenv libevent-dev virtualenv
    $ git clone https://github.com/lyramer/kiln-controller.git
    $ cd kiln-controller
    $ virtualenv -p python3 venv
    $ source venv/bin/activate
    $ pip install --upgrade setuptools
    $ pip install greenlet bottle gevent gevent-websocket

*Note: The above steps work on a Ubuntu install on your RPi if you prefer*

### Raspberry PI deployment

If you want to deploy the code on a PI for production:

    $ cd kiln-controller
    $ virtualenv -p python3 venv
    $ source venv/bin/activate
    $ pip install RPi.GPIO

If you also want to use the in-kernel SPI drivers with a MAX31855 sensor (but you can use the MAX31855 sensor without the SPI drivers too):
   
    $ sudo apt-get install python-dev
    $ pip install Adafruit-MAX31855

## Configuration

All parameters are defined in config.py, just copy the example and review/change to your mind's content.

    $ cp config.py.EXAMPLE config.py

You should change, test, and verify PID parameters in config.py.  Here is a [PID Tuning Guide](https://github.com/lyramer/kiln-controller/blob/master/docs/pid_tuning.md).

You may want to change the configuration parameter **sensor_time_wait**. It's the duty cycle for the entire system.  It's set to two seconds by default which means that a decision is made every 2s about whether to turn on relay[s] and for how long. If you use mechanical relays, you may want to increase this. At 2s, my SSR switches 11,000 times in 13 hours.

## Usage

### Server Startup

    $ source venv/bin/activate; ./kiln-controller.py

### Autostart Server onBoot (recommended)

If you want the server to autostart on boot, run the following command.

    $ /home/pi/kiln-controller/start-on-boot

This means that whenever the Pi is booted up going forward, it will immediately begin running the kiln controller code and you should be able to connect to the server to see the interface[^1]. I really recommend this because it means that when you get your project finished, all you need to do to run your kiln is plug the controller in. Ultimately, you can do away with the monitor and keyboard/mouse attached to the Pi since you can control the kiln from the web using the website interface. 

[^1] Do note that it takes the Pi a couple minutes to boot up so you won't get your website the moment you plug your Pi in.

### Client Access

Click http://127.0.0.1:8081 for local development (if you're on the Pi itself), or use the IP of your PI and the port defined in config.py (default 8081). 

To find the IP of your Pi (say you want to view the kiln controller interface from your laptop), go to the terminal on the Pi and run 'hostname -I'. There are [alternative techniques for finding it here](https://www.raspberrypi.org/documentation/remote-access/ip-address.md). You're looking for the number which follows the IP address format, which is something like 000.0.0.0 but which may have some two-digit numbers instead of one-digit ones in it.

Once you have your IP, sub it in for 127.0.0.1 in this link: http://127.0.0.1:8081 and you should be able to see the control panel from any device you like. If you change your port from the default 8081 (set in config.py), you'll need to change the number after the colon in the link to whichever port you've chosen. If this is all brand new to you, stick to 8081. It's simplest. If you run into conflicts (aka something else running on the Pi is using port 8081), changing it to any of 8080, 3000, 5000, or 3001 should fix ya. 

Remember that you need to use http and not https in the link..

### Running a Simulation Firing

Go to your kiln controller panel (see client access step for details).

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

## Origin
This project was originally forked from https://github.com/apollo-ng/picoReflow but has diverged a large amount.
