import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class CentralLightController extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light',
            },
            native: { control },
        });

        await this.createButtonCommandStateObjectAsync(
            control.name,
            uuid,
            'control',
            /* TODO: re-add: { smartIgnore: false }, */
        );
        this.addStateChangeListener(
            `${uuid}.control`,
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                if (newValue) {
                    this.sendCommand(control.uuidAction, 'on');
                } else {
                    this.sendCommand(control.uuidAction, 'reset');
                }
            },
            { selfAck: true },
        );
    }
}
