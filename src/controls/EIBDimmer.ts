import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class EIBDimmer extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['position']);

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'position',
            'number',
            'level.dimmer',
            { write: true },
        );

        this.addStateChangeListener(`${uuid}.position`, (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, this.convertStateToInt(newValue).toString());
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'on');
        this.addStateChangeListener(
            `${uuid}.on`,
            () => {
                this.sendCommand(control.uuidAction, 'on');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'off');
        this.addStateChangeListener(
            `${uuid}.off`,
            () => {
                this.sendCommand(control.uuidAction, 'off');
            },
            { selfAck: true },
        );
    }
}
