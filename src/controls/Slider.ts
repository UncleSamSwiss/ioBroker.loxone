import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class Slider extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control: control as any },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value', 'error']);

        const common: Partial<ioBroker.StateCommon> = { write: true };
        if (control.hasOwnProperty('details')) {
            common.min = control.details.min as number;
            common.max = control.details.max as number;
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
            this.sendCommand(control.uuidAction, (newValue || '0').toString());
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
                    return this.setFormattedStateAck(name, value, control.details.format as string);
                },
            );
        }
    }
}
