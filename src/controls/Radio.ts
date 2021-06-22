import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

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
        if (control.details.hasOwnProperty('allOff')) {
            states['0'] = control.details.allOff as string;
        }
        if (control.details.hasOwnProperty('outputs')) {
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
        this.addStateChangeListener(uuid + '.activeOutput', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            if (newValue == oldValue) {
                return;
            }
            const value = this.convertStateToInt(newValue);
            if (value === 0) {
                this.sendCommand(control.uuidAction, 'reset');
            } else if (states.hasOwnProperty(value)) {
                this.sendCommand(control.uuidAction, value.toString());
            }
        });
    }
}
