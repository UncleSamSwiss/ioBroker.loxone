import type { Control } from '../structure-file';
import { ColorpickerBase } from './ColorpickerBase';
import type { ControlType } from './control-base';

/**
 * Handler for Colorpicker controls.
 */
export class Colorpicker extends ColorpickerBase {
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
                role: 'light.color.rgb',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['color', 'favorites']);

        await this.loadColorPickerControlBaseAsync(uuid, control);
    }
}
