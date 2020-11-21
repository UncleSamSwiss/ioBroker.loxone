"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorpickerBase = void 0;
const colorConvert = require("color-convert");
const control_base_1 = require("./control-base");
class ColorpickerBase extends control_base_1.ControlBase {
    loadColorPickerControlBaseAsync(uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!control.states || !control.states.hasOwnProperty('color')) {
                return;
            }
            yield this.updateStateObjectAsync(uuid + '.red', {
                name: control.name + ': red',
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.red',
                min: 0,
                max: 255,
            }, control.states.color, (name, value) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    this.setStateAck(name, rgb[0]);
                }
            });
            yield this.updateStateObjectAsync(uuid + '.green', {
                name: control.name + ': green',
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.green',
                min: 0,
                max: 255,
            }, control.states.color, (name, value) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    this.setStateAck(name, rgb[1]);
                }
            });
            yield this.updateStateObjectAsync(uuid + '.blue', {
                name: control.name + ': blue',
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.blue',
                min: 0,
                max: 255,
            }, control.states.color, (name, value) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    this.setStateAck(name, rgb[2]);
                }
            });
            yield this.updateStateObjectAsync(uuid + '.rgb', {
                name: control.name + ': RGB',
                read: true,
                write: false,
                type: 'string',
                role: 'level.color.rgb',
            }, control.states.color, (name, value) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    this.setStateAck(name, rgb[0] + ',' + rgb[1] + ',' + rgb[2]);
                }
            });
            yield this.updateStateObjectAsync(uuid + '.level', {
                name: control.name + ': Level (only with colorTemperature)',
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.level',
                min: 0,
                max: 100,
            }, control.states.color, (name, value) => {
                const brightnessTemperature = this.loxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    this.setStateAck(name, brightnessTemperature[0]);
                }
            });
            yield this.updateStateObjectAsync(uuid + '.colorTemperature', {
                name: control.name + ': The temperature of the light in °K 2700-6500',
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.temperature',
            }, control.states.color, (name, value) => {
                const brightnessTemperature = this.loxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    this.setStateAck(name, brightnessTemperature[1]);
                }
            });
            yield this.updateStateObjectAsync(uuid + '.colorTemperatureHue', {
                name: control.name + ': The temperature of the light in °K scaled for Hue 2000-6500',
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.temperature',
            }, control.states.color, (name, value) => {
                const brightnessTemperature = this.loxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    this.setStateAck(name, Math.round((brightnessTemperature[1] - 2700) * 1.184210526315789 + 2000));
                }
            });
            // we use a timer (100 ms) to update the three color values,
            // so if somebody sends us the three values (almost) at once,
            // we don't change the color three times using commands
            const parentId = this.adapter.namespace + '.' + uuid;
            const updateColorValue = () => __awaiter(this, void 0, void 0, function* () {
                const states = yield this.adapter.getStatesAsync(uuid + '.*');
                const red = this.convertStateToInt(states[parentId + '.red'].val);
                const green = this.convertStateToInt(states[parentId + '.green'].val);
                const blue = this.convertStateToInt(states[parentId + '.blue'].val);
                const hsv = colorConvert.rgb.hsv([red, green, blue]);
                const command = `hsv(${hsv[0]},${hsv[1]},${hsv[2]}`;
                this.sendCommand(control.uuidAction, command);
            });
            const startUpdateTimer = () => {
                if (this.colorUpdateTimer) {
                    clearTimeout(this.colorUpdateTimer);
                }
                this.colorUpdateTimer = setTimeout(updateColorValue, 100);
            };
            this.addStateChangeListener(uuid + '.red', startUpdateTimer);
            this.addStateChangeListener(uuid + '.green', startUpdateTimer);
            this.addStateChangeListener(uuid + '.blue', startUpdateTimer);
        });
    }
    loxoneColorToRgb(value) {
        if (!value) {
            return undefined;
        }
        value = value.toString();
        let match = value.match(/hsv\((\d+),(\d+),(\d+)\)/i);
        if (match) {
            const hue = parseInt(match[1]);
            const sat = parseInt(match[2]);
            const val = parseInt(match[3]);
            return colorConvert.hsv.rgb([hue, sat, val]);
        }
        match = value.match(/temp\((\d+),(\d+)\)/i);
        if (match) {
            const brightness = parseFloat(match[1]) / 100;
            const temperature = parseFloat(match[2]) / 100;
            // based on http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
            let red = 255;
            let green = 255;
            let blue = 255;
            if (temperature <= 66) {
                green = 99.4708025861 * Math.log(temperature) - 161.1195681661;
                if (temperature <= 19) {
                    blue = 0;
                }
                else {
                    blue = 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
                }
            }
            else {
                red = 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
                green = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
            }
            red = Math.min(Math.max(red, 0), 255) * brightness;
            green = Math.min(Math.max(green, 0), 255) * brightness;
            blue = Math.min(Math.max(blue, 0), 255) * brightness;
            return [Math.round(red), Math.round(green), Math.round(blue)];
        }
        return undefined;
    }
    loxoneColorToBrightnessTemperature(value) {
        if (!value) {
            return undefined;
        }
        value = value.toString();
        const match = value.match(/temp\((\d+),(\d+)\)/i);
        if (match) {
            const brightness = parseFloat(match[1]);
            const temperature = parseFloat(match[2]);
            return [Math.round(brightness), Math.round(temperature)];
        }
        return undefined;
    }
}
exports.ColorpickerBase = ColorpickerBase;
//# sourceMappingURL=ColorpickerBase.js.map