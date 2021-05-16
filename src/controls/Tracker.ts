import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class Tracker extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'info',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['entries']);

        await this.createListControlStateObjectAsync(control.name, uuid, control.states, 'entries');
    }
}
