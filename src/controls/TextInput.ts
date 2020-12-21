import { CurrentStateValue, OldStateValue } from '../main';
import { Control, ControlStates } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class TextInput extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control: control as any },
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
        this.addStateChangeListener(uuid + '.text', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, (newValue || '').toString());
        });

        if (!control.hasOwnProperty('details')) {
            return;
        }

        if (control.details.hasOwnProperty('format')) {
            await this.updateStateObjectAsync(
                uuid + '.value-formatted',
                {
                    name: control.name + ': formatted value',
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
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
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
                uuid + '.' + this.normalizeName(name),
                common,
                states[name],
                this.setStateAck.bind(this),
            );
        }
    }
}
