import { ColorpickerBase } from './ColorpickerBase';
import { ControlType } from './ControlBase';

export class Colorpicker extends ColorpickerBase {
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

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['color', 'favorites']);

        await this.loadColorPickerControlBaseAsync(uuid, control);
    }
}
