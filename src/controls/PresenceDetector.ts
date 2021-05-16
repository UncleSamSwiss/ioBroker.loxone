import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class PresenceDetector extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'switch',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'active',
            'locked',
            'events',
            'infoText',
        ]);

        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'locked', 'indicator');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'events', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'infoText',
            'string',
            'text',
        );

        await this.loadSubControlsAsync(uuid, control);
    }
}
