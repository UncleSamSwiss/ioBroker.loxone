import { ControlBase, ControlType } from './control-base';

export class InfoOnlyDigital extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'switch',
            },
            native: control,
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
            await this.updateStateObjectAsync(
                uuid + '.active-text',
                {
                    name: control.name + ': active as text',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    smartIgnore: true,
                },
                control.states.active,
                (name: string, value: any) => {
                    this.setStateAck(name, value == 1 ? control.details.text.on : control.details.text.off);
                },
            );
        }

        if (control.details.hasOwnProperty('image')) {
            await this.updateStateObjectAsync(
                uuid + '.active-image',
                {
                    name: control.name + ': active as image',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    smartIgnore: true,
                },
                control.states.active,
                (name: string, value: any) => {
                    this.setStateAck(name, value == 1 ? control.details.image.on : control.details.image.off);
                },
            );
        }

        if (control.details.hasOwnProperty('color')) {
            await this.updateStateObjectAsync(
                uuid + '.active-color',
                {
                    name: control.name + ': active as color',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    smartIgnore: true,
                },
                control.states.active,
                (name: string, value: any) => {
                    this.setStateAck(name, value == 1 ? control.details.color.on : control.details.color.off);
                },
            );
        }
    }
}
