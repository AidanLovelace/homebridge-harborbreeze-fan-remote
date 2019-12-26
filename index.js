//@ts-check

const API = require('homebridge').API
var inherits = require('util').inherits;
/** @type {HAPNodeJS.Service} */
let Service
/** @type {HAPNodeJS.Characteristic} */
let Characteristic

let LIGHT_PIN = 26;
let OFF_PIN = 1;
let LOW_PIN = 6;
let MED_PIN = 28;
let HIGH_PIN = 4;

const exec = require('child_process').execSync

const gpio = {
  OUTPUT: 'output',
  INPUT: 'input',

  pinMode: function (pin, mode) {
    exec(`/usr/bin/gpio mode ${pin} ${mode}`)
  },
  writeDigital: function (pin, value) {
    exec(`/usr/bin/gpio write ${pin} ${value ? '1' : '0'}`)
  },
  quickPulseDigital: function (pin, start) {
    if (start == null) start = false;
    console.log('Pulsing Pin:', pin)
    exec(`/usr/bin/gpio write ${pin} ${start ? '0' : '1'} && /usr/bin/gpio write ${pin} ${start ? '1' : '0'} && sleep 0.01`)
  },
  delayPulseDigital: function (pin, delay, start) {
    if (start == null) start = false;
    exec(`/usr/bin/gpio write ${pin} ${start ? '0' : '1'} && sleep ${delay} && /usr/bin/gpio write ${pin} ${start ? '1' : '0'} && sleep 0.01`)
  }
}


module.exports = (/** @type {API} */ homebridge) => {
  /* this is the starting point for the plugin where we register the accessory */
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  /**
   * Characteristic "Rotation Speed"
   */

  Characteristic.RotationSpeed = function() {
    Characteristic.call(this, 'Rotation Speed', '00000029-0000-1000-8000-0026BB765291');
    this.setProps({
      format: Characteristic.Formats.INT,
      unit: Characteristic.Units.PERCENTAGE,
      maxValue: 100,
      minValue: 0,
      minStep: 33,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };
  inherits(Characteristic.RotationSpeed, Characteristic);

  homebridge.registerAccessory('homebridge-aidan-fan', 'HarborBreezeFan', HarborBreezeFan)
}

class HarborBreezeFan {
  constructor(log, config) {
    /*
     * The constructor function is called when the plugin is registered.
     * log is a function that can be used to log output to the homebridge console
     * config is an object that contains the config for this plugin that was defined the homebridge config.json
     */

    /* assign both log and config to properties on 'this' class so we can use them in other methods */
    this.log = log
    this.config = config
    
    this.fanService = new Service.Fan("Fan", null)
    this.lightService = new Service.Lightbulb("LED Light", null)
    
  }

  getServices() {
    /*
     * The getServices function is called by Homebridge and should return an array of Services this accessory is exposing.
     * It is also where we bootstrap the plugin to tell Homebridge which function to use for which action.
     */

    /* Create a new information service. This just tells HomeKit about our accessory. */
    const informationService = new Service.AccessoryInformation(null, null)
      .setCharacteristic(Characteristic.Manufacturer, 'Harbor Breeze')
      .setCharacteristic(Characteristic.Model, 'FW60AGV3LR')
      .setCharacteristic(Characteristic.SerialNumber, 'B8:27:EB:B6:4D:21')

    /*
     * For each of the service characteristics we need to register setters and getter functions
     * 'get' is called when HomeKit wants to retrieve the current state of the characteristic
     * 'set' is called when HomeKit wants to update the value of the characteristic
     */
    this.fanService.getCharacteristic(Characteristic.On)
      .on('get', this.getFanOnCharacteristicHandler.bind(this))
      .on('set', this.setFanOnCharacteristicHandler.bind(this))

    this.fanService.getCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getRotationSpeedCharacteristicHandler.bind(this))
      .on('set', this.setRotationSpeedCharacteristicHandler.bind(this))

    this.lightService.getCharacteristic(Characteristic.On)
      .on('get', this.getLightOnCharacteristicHandler.bind(this))
      .on('set', this.setLightOnCharacteristicHandler.bind(this))

    gpio.pinMode(LIGHT_PIN, gpio.OUTPUT)
    gpio.pinMode(OFF_PIN, gpio.OUTPUT)
    gpio.pinMode(LOW_PIN, gpio.OUTPUT)
    gpio.pinMode(MED_PIN, gpio.OUTPUT)
    gpio.pinMode(HIGH_PIN, gpio.OUTPUT)
    // Set all high to not be holding down buttons
    gpio.writeDigital(LIGHT_PIN, true)
    gpio.writeDigital(OFF_PIN, true)
    gpio.writeDigital(LOW_PIN, true)
    gpio.writeDigital(MED_PIN, true)
    gpio.writeDigital(HIGH_PIN, true)

    this.setDefaultState()

    /* Return both the main services and the informationService */
    return [informationService, this.fanService, this.lightService]
  }

  setDefaultState() {
    gpio.writeDigital(LIGHT_PIN, true)
    gpio.delayPulseDigital(LIGHT_PIN, 5, true) // Force the light on.
    exec(`sleep 1`)
    gpio.quickPulseDigital(LIGHT_PIN, true) // Light is in default state: off
    this.lightOn = false;

    gpio.quickPulseDigital(OFF_PIN, true) // Fan is in default state: off
    this.isOn = false;
    this.fanSpeed = 0;

  }

  updateLight() {
    if (this.lightOn !== this.softLightOn) {
      gpio.quickPulseDigital(LIGHT_PIN, true)
      this.lightOn = this.softLightOn
    }
  }

  updateFan() {
    if (this.isOn === true) {
      switch (this.fanSpeed) {
        case 0:
          gpio.quickPulseDigital(OFF_PIN, true)
          gpio.quickPulseDigital(OFF_PIN, true)
          break;
        case 33:
          gpio.quickPulseDigital(LOW_PIN, true)
          gpio.quickPulseDigital(LOW_PIN, true)
          break;
        case 66:
          gpio.quickPulseDigital(MED_PIN, true)
          gpio.quickPulseDigital(MED_PIN, true)
          break;
        case 99:
          gpio.quickPulseDigital(HIGH_PIN, true)
          gpio.quickPulseDigital(HIGH_PIN, true)
          break;
      }
    } else {
      gpio.quickPulseDigital(OFF_PIN, true)
      gpio.quickPulseDigital(OFF_PIN, true)
    }
  }

  setLightOnCharacteristicHandler(value, callback) {
    this.softLightOn = value
    this.updateLight()
    callback(null)
  }

  getLightOnCharacteristicHandler(callback) {
    callback(null, this.softLightOn)
  }

  setFanOnCharacteristicHandler(value, callback) {
    this.isOn = value
    console.log('Fan Power:', this.isOn)
    this.updateFan()
    callback(null)
  }

  getFanOnCharacteristicHandler(callback) {
    callback(null, this.isOn)
  }

  setRotationSpeedCharacteristicHandler(value, callback) {
    this.fanSpeed = value
    console.log('Fan Speed:', this.fanSpeed)
    this.updateFan()
    callback(null)
  }

  getRotationSpeedCharacteristicHandler(callback) {
    callback(null, this.fanSpeed)
  }

}