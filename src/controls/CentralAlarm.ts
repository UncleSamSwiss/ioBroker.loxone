import { CurrentStateValue, OldStateValue } from '../main';
import { ControlBase, ControlType } from './ControlBase';

export class CentralAlarm extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm',
            },
            native: control,
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'armed', { smartIgnore: false });
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
