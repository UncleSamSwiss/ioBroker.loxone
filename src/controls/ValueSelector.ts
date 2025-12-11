import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for ValueSelector controls.
 */
export class ValueSelector extends ControlBase {
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

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value', 'min', 'max', 'step']);

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'number', 'level', {
            write: true,
        });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'min', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'max', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'step', 'number', 'value');

        this.addStateChangeListener(`${uuid}.value`, (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, this.convertStateToInt(newValue).toString());
        });
    }
}
