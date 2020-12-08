import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class LightController extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light',
            },
            native: { control: control as any },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['activeScene', 'sceneList']);

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'activeScene',
            'number',
            'level',
            { write: true },
        );
        this.addStateChangeListener(uuid + '.activeScene', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            newValue = this.convertStateToInt(newValue);
            if (newValue === 9) {
                this.sendCommand(control.uuidAction, 'on');
            } else {
                this.sendCommand(control.uuidAction, newValue.toString());
            }
        });

        if (control.states.hasOwnProperty('sceneList')) {
            await this.updateStateObjectAsync(
                uuid + '.sceneList',
                {
                    name: control.name + ': sceneList',
                    read: true,
                    write: false,
                    type: 'array',
                    role: 'list',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.sceneList,
                (name: string, value: any) => {
                    // weird documentation: they say it's 'text' within the struct, but I get the value directly; let's support both
                    if (value.hasOwnProperty('text')) {
                        return this.setStateAck(name, value.text.split(','));
                    }
                    return this.setStateAck(name, value.toString().split(','));
                },
            );
        }

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'plus');
        this.addStateChangeListener(uuid + '.plus', () => {
            this.sendCommand(control.uuidAction, 'plus');
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'minus');
        this.addStateChangeListener(uuid + '.minus', () => {
            this.sendCommand(control.uuidAction, 'minus');
        });

        // for Alexa support:
        await this.createButtonCommandStateObjectAsync(
            control.name,
            uuid,
            'control',
            /* TODO: re-add: { smartIgnore: false }*/
        );
        this.addStateChangeListener(uuid + '.control', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            if (newValue) {
                this.sendCommand(control.uuidAction, 'on');
            } else {
                this.sendCommand(control.uuidAction, '0');
            }
        });

        // TODO: currently we don't support scene modifications ("learn" and "delete" commands),
        // IMHO this should be done by the user through the Loxone Web interface

        await this.loadSubControlsAsync(uuid, control);
    }
}
