'use strict';
import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Remote aka. Media Controller
 */
export class Remote extends ControlBase {
    /**
     * Loads the control and sets up state objects and event handlers.
     *
     * @param type The type of the control ('device' or 'channel').
     * @param uuid The unique identifier of the control.
     * @param control The control data from the structure file.
     */
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        this.adapter.log.debug(`Remote controls: ${JSON.stringify(control)}`);
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'media',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['jLocked', 'mode']);

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'mode', 'string', 'text', {
            write: true,
        });
        this.addStateChangeListener(`${uuid}.mode`, (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            if (newValue && newValue !== '0') {
                // Send the actual mode number
                this.sendCommand(control.uuidAction, `mode/${newValue}`);
            } else {
                // Sending mode zero is not supported so sent reset/all off
                this.sendCommand(control.uuidAction, 'reset');
            }
        });
    }
}
