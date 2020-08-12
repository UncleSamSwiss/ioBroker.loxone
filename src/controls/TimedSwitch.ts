import { CurrentStateValue, OldStateValue } from '../main';
import { ControlBase, ControlType } from './ControlBase';

export class TimedSwitch extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'switch',
            },
            native: control,
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'deactivationDelayTotal',
            'deactivationDelay',
        ]);

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'deactivationDelayTotal',
            'number',
            'value.interval',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'deactivationDelay',
            'number',
            'value.interval',
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'active', {
            smartIgnore: type == 'channel',
        });
        this.addStateChangeListener(uuid + '.active', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            if (newValue == oldValue) {
                return;
            } else if (newValue) {
                this.sendCommand(control.uuidAction, 'on');
            } else {
                this.sendCommand(control.uuidAction, 'off');
            }
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'pulse');
        this.addStateChangeListener(uuid + '.pulse', () => {
            this.sendCommand(control.uuidAction, 'pulse');
        });
    }
}
