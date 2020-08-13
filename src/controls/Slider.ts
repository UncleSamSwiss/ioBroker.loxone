import { CurrentStateValue, OldStateValue } from '../main';
import { ControlBase, ControlType } from './control-base';

export class Slider extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: control,
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value', 'error']);

        const common: any = { write: true };
        if (control.hasOwnProperty('details')) {
            common.min = control.details.min;
            common.max = control.details.max;
        }

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'value',
            'number',
            'level',
            common,
        );
        this.addStateChangeListener(uuid + '.value', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, (newValue || '').toString());
        });

        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'error',
            'indicator.maintenance',
        );

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
                    this.setFormattedStateAck(name, value, control.details.format);
                },
            );
        }
    }
}
