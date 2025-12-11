import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for Meter controls.
 */
export class Meter extends ControlBase {
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
                role: 'sensor',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['actual', 'total']);

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'actual',
            'number',
            'value.power.consumption',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'total',
            'number',
            'value.power.consumption',
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'reset');
        this.addStateChangeListener(
            `${uuid}.reset`,
            () => {
                this.sendCommand(control.uuidAction, 'reset');
            },
            { selfAck: true },
        );

        if (!('details' in control)) {
            return;
        }

        if ('actualFormat' in control.details) {
            await this.updateStateObjectAsync(
                `${uuid}.actual-formatted`,
                {
                    name: `${control.name}: formatted actual value`,
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.actual,
                async (name: string, value: any) => {
                    await this.setFormattedStateAck(name, value, control.details.actualFormat as string);
                },
            );
        }

        if ('totalFormat' in control.details) {
            await this.updateStateObjectAsync(
                `${uuid}.total-formatted`,
                {
                    name: `${control.name}: formatted total value`,
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.total,
                async (name: string, value: any) => {
                    await this.setFormattedStateAck(name, value, control.details.totalFormat as string);
                },
            );
        }
    }
}
