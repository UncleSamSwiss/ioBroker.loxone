import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class AlarmClock extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm', // TODO: what's the best role here? ioBroker doc is not very clear on what's an "alarm"
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'isEnabled',
            'isAlarmActive',
            'confirmationNeeded',
            'ringingTime',
            'ringDuration',
            'prepareDuration',
            'snoozeTime',
            'snoozeDuration',
        ]);

        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'isEnabled', 'switch', {
            write: true,
            // TODO: re-add: smartIgnore: false,
        });
        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'isAlarmActive',
            'indicator',
        );
        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'confirmationNeeded',
            'indicator',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'ringingTime',
            'number',
            'value.interval',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'ringDuration',
            'number',
            'value.interval',
            { write: true },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'prepareDuration',
            'number',
            'value.interval',
            { write: true },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'snoozeTime',
            'number',
            'value.interval',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'snoozeDuration',
            'number',
            'value.interval',
            { write: true },
        );

        this.addStateChangeListener(uuid + '.isEnabled', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'setActive/' + (newValue ? '0' : '1')); // yes, really, this is inverted!
        });
        this.addStateChangeListener(uuid + '.ringDuration', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'setRingDuration/' + newValue);
        });
        this.addStateChangeListener(
            uuid + '.prepareDuration',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setPrepDuration/' + newValue);
            },
        );
        this.addStateChangeListener(
            uuid + '.snoozeDuration',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setSnoozeDuration/' + newValue);
            },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'snooze');
        this.addStateChangeListener(uuid + '.snooze', () => {
            this.sendCommand(control.uuidAction, 'snooze');
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'dismiss');
        this.addStateChangeListener(uuid + '.dismiss', () => {
            this.sendCommand(control.uuidAction, 'dismiss');
        });
    }
}
