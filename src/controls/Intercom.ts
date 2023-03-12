import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class Intercom extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'info',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'bell',
            'lastBellEvents',
            'version',
        ]);

        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'bell', 'indicator');
        await this.createListControlStateObjectAsync(control.name, uuid, control.states, 'lastBellEvents');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'version', 'string', 'text');

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'answer');
        this.addStateChangeListener(
            uuid + '.answer',
            () => {
                this.sendCommand(control.uuidAction, 'answer');
            },
            { selfAck: true },
        );

        await this.loadSubControlsAsync(uuid, control);
    }
}
