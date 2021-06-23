import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class InfoOnlyText extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'info',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['text']);

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'text', 'string', 'text');

        if (!control.hasOwnProperty('details')) {
            return;
        }

        if (control.details.hasOwnProperty('format')) {
            await this.updateStateObjectAsync(
                uuid + '.text-formatted',
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
}
