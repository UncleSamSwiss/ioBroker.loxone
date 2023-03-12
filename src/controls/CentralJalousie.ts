import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class CentralJalousie extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'blind',
            },
            native: { control },
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'autoActive');
        this.addStateChangeListener(
            uuid + '.autoActive',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                if (newValue) {
                    this.sendCommand(control.uuidAction, 'auto');
                } else {
                    this.sendCommand(control.uuidAction, 'NoAuto');
                }
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'fullUp');
        this.addStateChangeListener(
            uuid + '.fullUp',
            () => {
                this.sendCommand(control.uuidAction, 'FullUp');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'fullDown');
        this.addStateChangeListener(
            uuid + '.fullDown',
            () => {
                this.sendCommand(control.uuidAction, 'FullDown');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'shade');
        this.addStateChangeListener(
            uuid + '.shade',
            () => {
                this.sendCommand(control.uuidAction, 'shade');
            },
            { selfAck: true },
        );
    }
}
