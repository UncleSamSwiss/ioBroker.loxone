import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class CentralAlarm extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm',
            },
            native: { control: control as any },
        });

        await this.createButtonCommandStateObjectAsync(
            control.name,
            uuid,
            'armed',
            /* TODO: re-add: { smartIgnore: false }, */
        );
        this.addStateChangeListener(uuid + '.armed', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, newValue ? 'on' : 'off');
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'delayedOn');
        this.addStateChangeListener(uuid + '.delayedOn', () => {
            this.sendCommand(control.uuidAction, 'delayedon');
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
        this.addStateChangeListener(uuid + '.quit', () => {
            this.sendCommand(control.uuidAction, 'quit');
        });
    }
}
