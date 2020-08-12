import { ControlBase, ControlType } from './ControlBase';

export class Meter extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: control,
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['actual', 'total']);

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'actual',
            'number',
            'value.power.consumption',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'total',
            'number',
            'value.power.consumption',
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'reset');
        this.addStateChangeListener(uuid + '.reset', () => {
            this.sendCommand(control.uuidAction, 'reset');
        });

        if (!control.hasOwnProperty('details')) {
            return;
        }

        if (control.details.hasOwnProperty('actualFormat')) {
            await this.updateStateObjectAsync(
                uuid + '.actual-formatted',
                {
                    name: control.name + ': formatted actual value',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    smartIgnore: true,
                },
                control.states.actual,
                (name: string, value: any) => {
                    this.setFormattedStateAck(name, value, control.details.actualFormat);
                },
            );
        }

        if (control.details.hasOwnProperty('totalFormat')) {
            await this.updateStateObjectAsync(
                uuid + '.total-formatted',
                {
                    name: control.name + ': formatted total value',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    smartIgnore: true,
                },
                control.states.total,
                (name: string, value: any) => {
                    this.setFormattedStateAck(name, value, control.details.totalFormat);
                },
            );
        }
    }
}
