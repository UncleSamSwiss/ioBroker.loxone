import type { Control } from '../structure-file';
import { ColorpickerBase } from './ColorpickerBase';
import type { ControlType } from './control-base';

export class ColorPickerV2 extends ColorpickerBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light.color.rgb',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'color',
            'sequence',
            'sequenceColorIdx',
        ]);

        await this.loadColorPickerControlBaseAsync(uuid, control);
    }
}
