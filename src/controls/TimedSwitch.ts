import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class TimedSwitch extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'switch',
            },
            native: { control },
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

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'pulse');
        this.addStateChangeListener(
            `${uuid}.pulse`,
            () => {
                this.sendCommand(control.uuidAction, 'pulse');
            },
            { selfAck: true },
        );
    }
}
