import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

/**
 * This class is used if the control has an unknown type.
 * It will just load the simple default states.
 */
export class Unknown extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: `Unsupported: ${control.name}`,
                role: 'info',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, []);

        await this.loadSubControlsAsync(uuid, control);
    }
}
