import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class InfoOnlyDigital extends ControlBase {
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

        if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('active')) {
            return;
        }

        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'indicator');

        if (!control.hasOwnProperty('details')) {
            return;
        }

        if (control.details.hasOwnProperty('text')) {
            const text: any = control.details.text;
            await this.updateStateObjectAsync(
                uuid + '.active-text',
                {
                    name: control.name + ': active as text',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.active,
                async (name: string, value: any) => {
                    await this.setStateAck(name, value == 1 ? text.on : text.off);
                },
            );
        }

        if (control.details.hasOwnProperty('image')) {
            const image: any = control.details.text;
            await this.updateStateObjectAsync(
                uuid + '.active-image',
                {
                    name: control.name + ': active as image',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.active,
                async (name: string, value: any) => {
                    await this.setStateAck(name, value == 1 ? image.on : image.off);
                },
            );
        }

        if (control.details.hasOwnProperty('color')) {
            const color: any = control.details.text;
            await this.updateStateObjectAsync(
                uuid + '.active-color',
                {
                    name: control.name + ': active as color',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.active,
                async (name: string, value: any) => {
                    await this.setStateAck(name, value == 1 ? color.on : color.off);
                },
            );
        }
    }
}
