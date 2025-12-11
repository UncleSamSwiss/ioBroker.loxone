import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for the CentralGate control.
 */
export class CentralGate extends ControlBase {
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
                role: 'blind',
            },
            native: { control },
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'open');
        this.addStateChangeListener(
            `${uuid}.open`,
            () => {
                this.sendCommand(control.uuidAction, 'open');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'close');
        this.addStateChangeListener(
            `${uuid}.close`,
            () => {
                this.sendCommand(control.uuidAction, 'close');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'stop');
        this.addStateChangeListener(
            `${uuid}.stop`,
            () => {
                this.sendCommand(control.uuidAction, 'stop');
            },
            { selfAck: true },
        );
    }
}
