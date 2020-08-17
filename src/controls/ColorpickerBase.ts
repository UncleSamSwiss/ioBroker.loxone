import * as colorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import { CurrentStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase } from './control-base';

export abstract class ColorpickerBase extends ControlBase {
    private colorUpdateTimer?: NodeJS.Timeout;

    async loadColorPickerControlBaseAsync(uuid: string, control: Control): Promise<void> {
        if (!control.states || !control.states.hasOwnProperty('color')) {
            return;
        }

        await this.updateStateObjectAsync(
            uuid + '.red',
            {
                name: control.name + ': red',
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.red',
                min: 0,
                max: 255,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            (name: string, value: CurrentStateValue) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    this.setStateAck(name, rgb[0]);
                }
            },
        );
        await this.updateStateObjectAsync(
            uuid + '.green',
            {
                name: control.name + ': green',
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.green',
                min: 0,
                max: 255,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            (name: string, value: CurrentStateValue) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    this.setStateAck(name, rgb[1]);
                }
            },
        );
        await this.updateStateObjectAsync(
            uuid + '.blue',
            {
                name: control.name + ': blue',
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.blue',
                min: 0,
                max: 255,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            (name: string, value: CurrentStateValue) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    this.setStateAck(name, rgb[2]);
                }
            },
        );
        await this.updateStateObjectAsync(
            uuid + '.rgb',
            {
                name: control.name + ': RGB',
                read: true,
                write: false,
                type: 'string',
                role: 'level.color.rgb',
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            (name: string, value: CurrentStateValue) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    this.setStateAck(name, rgb[0] + ',' + rgb[1] + ',' + rgb[2]);
                }
            },
        );
        await this.updateStateObjectAsync(
            uuid + '.level',
            {
                name: control.name + ': Level (only with colorTemperature)',
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.level',
                min: 0,
                max: 100,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            (name: string, value: CurrentStateValue) => {
                const brightnessTemperature = this.loxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    this.setStateAck(name, brightnessTemperature[0]);
                }
            },
        );
        await this.updateStateObjectAsync(
            uuid + '.colorTemperature',
            {
                name: control.name + ': The temperature of the light in °K 2700-6500',
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.temperature',
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            (name: string, value: CurrentStateValue) => {
                const brightnessTemperature = this.loxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    this.setStateAck(name, brightnessTemperature[1]);
                }
            },
        );
        await this.updateStateObjectAsync(
            uuid + '.colorTemperatureHue',
            {
                name: control.name + ': The temperature of the light in °K scaled for Hue 2000-6500',
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.temperature',
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            (name: string, value: CurrentStateValue) => {
                const brightnessTemperature = this.loxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    this.setStateAck(name, Math.round((brightnessTemperature[1] - 2700) * 1.184210526315789 + 2000));
                }
            },
        );

        // we use a timer (100 ms) to update the three color values,
        // so if somebody sends us the three values (almost) at once,
        // we don't change the color three times using commands
        const parentId = this.adapter.namespace + '.' + uuid;
        const updateColorValue = (): void => {
            const red = this.convertStateToInt(this.getCachedStateValue(parentId + '.red'));
            const green = this.convertStateToInt(this.getCachedStateValue(parentId + '.green'));
            const blue = this.convertStateToInt(this.getCachedStateValue(parentId + '.blue'));

            const hsl = colorConvert.rgb.hsv([red, green, blue]);
            const command = `hsv(${hsl[0]},${hsl[1]},${hsl[2]}`;
            this.sendCommand(control.uuidAction, command);
        };
        const startUpdateTimer = (): void => {
            if (this.colorUpdateTimer) {
                clearTimeout(this.colorUpdateTimer);
            }
            this.colorUpdateTimer = setTimeout(updateColorValue, 100);
        };
        this.addStateChangeListener(uuid + '.red', startUpdateTimer);
        this.addStateChangeListener(uuid + '.green', startUpdateTimer);
        this.addStateChangeListener(uuid + '.blue', startUpdateTimer);
    }

    private loxoneColorToRgb(value: CurrentStateValue): RGB | undefined {
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
                } else {
                    blue = 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
                }
            } else {
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

    private loxoneColorToBrightnessTemperature(value: CurrentStateValue): [number, number] | undefined {
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
