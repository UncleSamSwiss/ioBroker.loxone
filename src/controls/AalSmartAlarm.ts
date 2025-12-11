import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for AAL Smart Alarm controls.
 */
export class AalSmartAlarm extends ControlBase {
    /**
     * Loads the control and sets up state objects and event handlers.
     *
     * @param type The type of the control ('device' or 'channel').
     * @param uuid The unique identifier of the control.
     * @param control The control data from the structure file.
     */
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
            'alarmLevel',
            'alarmCause',
            'isLocked',
            'isLeaveActive',
            'disableEndTime',
        ]);

        const levelStates = {
            0: 'None',
            1: 'Immediate',
            2: 'Delayed',
        };
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'alarmLevel',
            'number',
            'value',
            { states: levelStates },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'alarmCause',
            'string',
            'text',
        );
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'isLocked', 'indicator');
        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'isLeaveActive',
            'indicator',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'disableEndTime',
            'number',
            'value.interval',
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'confirm');
        this.addStateChangeListener(
            `${uuid}.confirm`,
            () => {
                this.sendCommand(control.uuidAction, 'confirm');
            },
            { selfAck: true },
        );

        await this.createNumberInputStateObjectAsync(control.name, uuid, 'disable', 'level.timer');
        this.addStateChangeListener(`${uuid}.disable`, (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, `disable/${newValue || '0'}`);
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'startDrill');
        this.addStateChangeListener(
            `${uuid}.startDrill`,
            () => {
                this.sendCommand(control.uuidAction, 'startDrill');
            },
            { selfAck: true },
        );

        await this.loadSubControlsAsync(uuid, control);
    }
}
