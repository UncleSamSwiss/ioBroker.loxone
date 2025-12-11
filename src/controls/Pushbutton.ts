import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for Pushbutton controls.
 */
export class Pushbutton extends ControlBase {
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
                role: 'switch',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['active']);

        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'switch', {
            write: true,
            // TODO: re-add: smartIgnore: type == 'channel',
        });

        this.addStateChangeListener(
            `${uuid}.active`,
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                if (newValue) {
                    this.sendCommand(control.uuidAction, 'on');
                } else {
                    this.sendCommand(control.uuidAction, 'off');
                }
            },
            { notIfEqual: true },
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
