import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control, ControlStates } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for TextInput controls.
 */
export class TextInput extends ControlBase {
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

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['text']);

        const common: Partial<ioBroker.StateCommon> = { write: true };

        await this.createTextInputStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'text',
            'string',
            'text',
            common,
        );
        this.addStateChangeListener(`${uuid}.text`, (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, (newValue || '').toString());
        });

        if (!('details' in control)) {
            return;
        }

        if ('format' in control.details) {
            await this.updateStateObjectAsync(
                `${uuid}.value-formatted`,
                {
                    name: `${control.name}: formatted value`,
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.value,
                async (name: string, value: any) => {
                    await this.setFormattedStateAck(name, value, control.details.format as string);
                },
            );
        }
    }

    protected async createTextInputStateObjectAsync(
        controlName: string,
        uuid: string,
        states: ControlStates,
        name: string,
        type: ioBroker.CommonType,
        role: string,
        commonExt?: Partial<ioBroker.StateCommon>,
    ): Promise<void> {
        if (states !== undefined && name in states) {
            let common: ioBroker.StateCommon = {
                name: `${controlName}: ${name}`,
                read: false,
                write: true,
                type: type,
                role: role,
                //smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(
                `${uuid}.${this.normalizeName(name)}`,
                common,
                states[name],
                this.setStateAck.bind(this),
            );
        }
    }
}
