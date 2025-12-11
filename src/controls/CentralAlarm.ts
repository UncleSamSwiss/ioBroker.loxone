import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class CentralAlarm extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm',
            },
            native: { control },
        });

        await this.createButtonCommandStateObjectAsync(
            control.name,
            uuid,
            'armed',
            /* TODO: re-add: { smartIgnore: false }, */
        );
        this.addStateChangeListener(
            `${uuid}.armed`,
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, newValue ? 'on' : 'off');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'delayedOn');
        this.addStateChangeListener(
            `${uuid}.delayedOn`,
            () => {
                this.sendCommand(control.uuidAction, 'delayedon');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
        this.addStateChangeListener(
            `${uuid}.quit`,
            () => {
                this.sendCommand(control.uuidAction, 'quit');
            },
            { selfAck: true },
        );
    }
}
