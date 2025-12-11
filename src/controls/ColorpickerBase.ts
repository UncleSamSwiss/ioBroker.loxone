import type { RGB } from 'color-convert';
import colorConvert from 'color-convert';
import type { CurrentStateValue } from '../main';
import type { Control } from '../structure-file';
import { ControlBase } from './control-base';

/**
 * Base class for color picker controls.
 */
export abstract class ColorpickerBase extends ControlBase {
    private colorUpdateTimer?: NodeJS.Timeout;

    /**
     * Loads the color picker control and sets up state objects and event handlers.
     *
     * @param uuid The unique identifier of the control.
     * @param control The control data from the structure file.
     * @returns A promise that resolves when the loading is complete.
     */
    protected async loadColorPickerControlBaseAsync(uuid: string, control: Control): Promise<void> {
        if (!control.states || !('color' in control.states)) {
            return;
        }

        if (control.details.pickerType === 'Rgb') {
            await this.loadRgbColorPickerAsync(uuid, control);
        } else if (control.details.pickerType === 'Lumitech') {
            await this.loadLumitechColorPickerAsync(uuid, control);
        } else {
            throw new Error(`Unsupported color picker type: ${control.details.pickerType as string}`);
        }
    }

    private async loadRgbColorPickerAsync(uuid: string, control: Control): Promise<void> {
        await this.updateStateObjectAsync(
            `${uuid}.red`,
            {
                name: `${control.name}: red`,
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.red',
                min: 0,
                max: 255,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    await this.setStateAck(name, rgb[0]);
                }
            },
        );
        await this.updateStateObjectAsync(
            `${uuid}.green`,
            {
                name: `${control.name}: green`,
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.green',
                min: 0,
                max: 255,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    await this.setStateAck(name, rgb[1]);
                }
            },
        );
        await this.updateStateObjectAsync(
            `${uuid}.blue`,
            {
                name: `${control.name}: blue`,
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.blue',
                min: 0,
                max: 255,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    await this.setStateAck(name, rgb[2]);
                }
            },
        );
        await this.updateStateObjectAsync(
            `${uuid}.rgb`,
            {
                name: `${control.name}: RGB`,
                read: true,
                write: false,
                type: 'string',
                role: 'level.color.rgb',
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const rgb = this.loxoneColorToRgb(value);
                if (rgb !== undefined) {
                    await this.setStateAck(name, `${rgb[0]},${rgb[1]},${rgb[2]}`);
                }
            },
        );
        await this.updateStateObjectAsync(
            `${uuid}.level`,
            {
                name: `${control.name}: Level (only with colorTemperature)`,
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.level',
                min: 0,
                max: 100,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const brightnessTemperature = this.lumitechOrLoxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    await this.setStateAck(name, brightnessTemperature[0]);
                }
            },
        );
        await this.updateStateObjectAsync(
            `${uuid}.colorTemperature`,
            {
                name: `${control.name}: The temperature of the light in °K 2700-6500`,
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.temperature',
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const brightnessTemperature = this.lumitechOrLoxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    await this.setStateAck(name, brightnessTemperature[1]);
                }
            },
        );
        await this.updateStateObjectAsync(
            `${uuid}.colorTemperatureHue`,
            {
                name: `${control.name}: The temperature of the light in °K scaled for Hue 2000-6500`,
                read: true,
                write: false,
                type: 'number',
                role: 'level.color.temperature',
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const brightnessTemperature = this.lumitechOrLoxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    await this.setStateAck(
                        name,
                        Math.round((brightnessTemperature[1] - 2700) * 1.184210526315789 + 2000),
                    );
                }
            },
        );

        // we use a timer (100 ms) to update the three color values,
        // so if somebody sends us the three values (almost) at once,
        // we don't change the color three times using commands
        const parentId = `${this.adapter.namespace}.${uuid}`;
        const updateColorValue = async (): Promise<void> => {
            const states = await this.adapter.getStatesAsync(`${uuid}.*`);
            const red = this.convertStateToInt(states[`${parentId}.red`].val);
            const green = this.convertStateToInt(states[`${parentId}.green`].val);
            const blue = this.convertStateToInt(states[`${parentId}.blue`].val);

            const hsv = colorConvert.rgb.hsv([red, green, blue]);
            const command = `hsv(${hsv[0]},${hsv[1]},${hsv[2]})`;
            this.sendCommand(control.uuidAction, command);
        };
        const startUpdateTimer = (): void => {
            if (this.colorUpdateTimer) {
                clearTimeout(this.colorUpdateTimer);
            }
            this.colorUpdateTimer = setTimeout(updateColorValue, 100);
        };
        this.addStateChangeListener(`${uuid}.red`, startUpdateTimer);
        this.addStateChangeListener(`${uuid}.green`, startUpdateTimer);
        this.addStateChangeListener(`${uuid}.blue`, startUpdateTimer);
    }

    private async loadLumitechColorPickerAsync(uuid: string, control: Control): Promise<void> {
        await this.updateStateObjectAsync(
            `${uuid}.brightness`,
            {
                name: `${control.name}: Brightness`,
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.level',
                min: 0,
                max: 100,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const brightnessTemperature = this.lumitechOrLoxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    await this.setStateAck(name, brightnessTemperature[0]);
                }
            },
        );
        await this.updateStateObjectAsync(
            `${uuid}.temperature`,
            {
                name: `${control.name}: Temperature`,
                read: true,
                write: true,
                type: 'number',
                role: 'level.color.temperature',
                min: 2000,
                max: 8000,
                // TODO: re-add: smartIgnore: true,
            },
            control.states.color,
            async (name: string, value: CurrentStateValue) => {
                const brightnessTemperature = this.lumitechOrLoxoneColorToBrightnessTemperature(value);
                if (brightnessTemperature !== undefined) {
                    await this.setStateAck(name, brightnessTemperature[1]);
                }
            },
        );

        // we use a timer (100 ms) to update the two color values,
        // so if somebody sends us the two values (almost) at once,
        // we don't change the color twice using commands
        const parentId = `${this.adapter.namespace}.${uuid}`;
        const updateColorValue = async (): Promise<void> => {
            const states = await this.adapter.getStatesAsync(`${uuid}.*`);
            const brightness = this.convertStateToInt(states[`${parentId}.brightness`].val);
            const temperature = this.convertStateToInt(states[`${parentId}.temperature`].val);

            const command = `lumitech(${brightness},${temperature})`;
            this.sendCommand(control.uuidAction, command);
        };
        const startUpdateTimer = (): void => {
            if (this.colorUpdateTimer) {
                clearTimeout(this.colorUpdateTimer);
            }
            this.colorUpdateTimer = setTimeout(updateColorValue, 100);
        };
        this.addStateChangeListener(`${uuid}.brightness`, startUpdateTimer);
        this.addStateChangeListener(`${uuid}.temperature`, startUpdateTimer);
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

    private lumitechOrLoxoneColorToBrightnessTemperature(value: CurrentStateValue): [number, number] | undefined {
        if (!value) {
            return undefined;
        }

        value = value.toString();

        const match = value.match(/(lumitech|temp)\((\d+),(\d+)\)/i);
        if (match) {
            const brightness = parseFloat(match[1]);
            const temperature = parseFloat(match[2]);

            return [Math.round(brightness), Math.round(temperature)];
        }

        return undefined;
    }
}
