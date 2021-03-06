# Harbor Breeze Fan Remote Homebridge Plug-in
This allows you to control a Harbor Breeze controller for ceiling fans.

## Prerequisites
The plugin can only run on a Raspberry Pi with `wiring-pi` installed. `sudo apt install wiring-pi` Sadly, I couldn’t get `node-wiring-pi` to compile on my Raspberry Pi Zero W, so I made the plugin call system commands.

It also requires that you physically wire in to the remote. Note that in most cases, you will no longer be able to use the remote independently of the Pi.

To wire into the remote, check for _each_ button pad which conductor is _not_ connected to ground. It is likely that even though the button pads for each button may be shaped the same, it’ll be a different conductor on each one. Connect, with a 66K resistor in the middle, each button to an I/O pin on the Pi, and connect the ground of the remote to the Pi. They have to share a ground potential in order for the remote to detect when the Pi pulls the button low. Speaking of which, these pins will be active-low so when the Pi boots up, all of the buttons will be considered to be being pressed, so that’s fun. You will have to figure a way for the original battery for the remote to remain so that the signal will be strong enough(most of the time, these are 12V batteries and the Pi runs on 5V).


## Installation
Install (if you haven’t already) homebridge. `sudo npm install -g --unsafe-perms homebridge` Note that you don’t _have_ to run homebridge in order to expose a HomeKit accessory on the network. I intend to implement this using NodeJS-HAP at some point in the future.

Make sure `wiring-pi` is installed. `sudo apt install wiring-pi`

Install this plugin `sudo npm install -g git+https://github.com/aidanlovelace/homebridge-harborbreeze-fan-remote.git`.

Add the accessory to your Homebridge config.
```
{
    "accessory": "HarborBreezeFan",
    "name": "Ceiling Fan"
}
```
