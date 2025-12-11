import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class InfoOnlyAnalog extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value']);

        if (!('states' in control) || !('value' in control.states)) {
            return;
        }

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'number', 'value');

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
}
