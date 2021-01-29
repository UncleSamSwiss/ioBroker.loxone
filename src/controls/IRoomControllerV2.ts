import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class IRoomControllerV2 extends ControlBase {
    private uuid = '';

    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        this.uuid = uuid;
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'thermo',
            },
            native: { control: control as any },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['comfortTolerance']);

        await this.updateStateObjectAsync(
            uuid + '.comfortTolerance',
            {
                name: control.name + ': comfortTolerance',
                read: true,
                write: true,
                type: 'number',
                role: 'level.temperature',
            },
            control.states.comfortTolerance,
            async (name: string, value: any) => {
                await this.setStateAck(this.uuid + '.' + name, value);
            },
        );
        this.addStateChangeListener(
            uuid + '.comfortTolerance',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setComfortTolerance/' + newValue);
            },
        );
    }
}
