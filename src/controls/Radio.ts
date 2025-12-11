import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class Radio extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'button',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['activeOutput']);

        let states: Record<string, string> = {};
        if ('allOff' in control.details) {
            states['0'] = control.details.allOff as string;
        }
        if ('outputs' in control.details) {
            states = { ...states, ...(control.details.outputs as Record<string, string>) };
        }
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'activeOutput',
            'number',
            'level',
            {
                states,
                write: true,
            },
        );
        this.addStateChangeListener(
            `${uuid}.activeOutput`,
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                const value = this.convertStateToInt(newValue);
                if (value === 0) {
                    this.sendCommand(control.uuidAction, 'reset');
                } else if (value in states) {
                    this.sendCommand(control.uuidAction, value.toString());
                }
            },
            { notIfEqual: true },
        );
    }
}
