import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class AalEmergency extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'status',
            'disableEndTime',
            'resetActive',
        ]);

        const statusStates = {
            '0': 'Running',
            '1': 'Triggered',
            '2': 'Reset',
            '3': 'Disabled',
        };
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'status',
            'number',
            'value',
            { states: statusStates },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'disableEndTime',
            'number',
            'value.interval',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'resetActive',
            'string',
            'text',
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'trigger');
        this.addStateChangeListener(
            uuid + '.trigger',
            () => {
                this.sendCommand(control.uuidAction, 'trigger');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
        this.addStateChangeListener(
            uuid + '.quit',
            () => {
                this.sendCommand(control.uuidAction, 'quit');
            },
            { selfAck: true },
        );

        await this.createNumberInputStateObjectAsync(control.name, uuid, 'disable', 'level.timer');
        this.addStateChangeListener(uuid + '.disable', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, `disable/${newValue || '0'}`);
        });

        await this.loadSubControlsAsync(uuid, control);
    }
}
