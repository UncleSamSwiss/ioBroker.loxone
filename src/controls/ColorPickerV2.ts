import { ColorpickerBase } from './ColorpickerBase';
import { ControlType } from './control-base';

export class ColorPickerV2 extends ColorpickerBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        if (control.details.pickerType != 'Rgb') {
            throw 'Unsupported color picker type: ' + control.details.pickerType;
        }

        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light.color.rgb',
            },
            native: control,
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'color',
            'sequence',
            'sequenceColorIdx',
        ]);

        await this.loadColorPickerControlBaseAsync(uuid, control);
    }
}
