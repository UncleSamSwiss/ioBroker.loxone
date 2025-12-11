import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for PresenceDetector controls.
 */
export class PresenceDetector extends ControlBase {
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

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'active',
            'locked',
            'events',
            'infoText',
        ]);

        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'locked', 'indicator');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'events', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'infoText',
            'string',
            'text',
        );

        await this.loadSubControlsAsync(uuid, control);
    }
}
