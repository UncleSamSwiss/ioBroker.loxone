import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for Hourcounter controls.
 */
export class Hourcounter extends ControlBase {
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
                role: 'timer',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'total',
            'remaining',
            'lastActivation',
            'overdue',
            'maintenanceInterval',
            'stateUnit',
            'active',
            'overdueSince',
        ]);
        // stateUnit is ignored as it is not used by ioBroker (all states are always in seconds)

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'total', 'number', 'value', {
            unit: 'sec',
        });

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'remaining',
            'number',
            'value',
            { unit: 'sec' },
        );

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'lastActivation',
            'number',
            'value.time',
        );

        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'overdue',
            'indicator.maintenance',
        );

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'maintenanceInterval',
            'number',
            'value',
            { unit: 'sec' },
        );

        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'active',
            'indicator.working',
        );

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'overdueSince',
            'number',
            'value',
            { unit: 'sec' },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'reset');
        this.addStateChangeListener(
            `${uuid}.reset`,
            () => {
                this.sendCommand(control.uuidAction, 'reset');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'resetAll');
        this.addStateChangeListener(
            `${uuid}.resetAll`,
            () => {
                this.sendCommand(control.uuidAction, 'resetAll');
            },
            { selfAck: true },
        );
    }
}
