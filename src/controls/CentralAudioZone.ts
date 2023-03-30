import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class CentralAudioZone extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'media.music',
            },
            native: { control },
        });

        await this.createButtonCommandStateObjectAsync(
            control.name,
            uuid,
            'control',
            /* TODO: re-add: { smartIgnore: false }, */
        );
        this.addStateChangeListener(
            uuid + '.control',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, newValue ? 'play' : 'pause');
            },
            { selfAck: true },
        );
    }
}
