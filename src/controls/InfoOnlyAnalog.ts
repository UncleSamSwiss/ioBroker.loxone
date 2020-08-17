import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class InfoOnlyAnalog extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control: control as any },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value']);

        if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('value')) {
            return;
        }

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'number', 'value');

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
                (name: string, value: any) => {
                    this.setFormattedStateAck(name, value, control.details.format as string);
                },
            );
        }
    }
}
