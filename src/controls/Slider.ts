import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class Slider extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value', 'error']);

        const common: Partial<ioBroker.StateCommon> = { write: true };
        if ('details' in control) {
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
        this.addStateChangeListener(`${uuid}.value`, (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, (newValue || '0').toString());
        });

        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'error',
            'indicator.maintenance',
        );

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
