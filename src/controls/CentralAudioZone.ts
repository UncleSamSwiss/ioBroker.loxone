import { CurrentStateValue, OldStateValue } from '../main';
import { ControlBase, ControlType } from './ControlBase';

export class CentralAudioZone extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'media.music',
            },
            native: control,
        });

        this.createButtonCommandStateObjectAsync(control.name, uuid, 'control', { smartIgnore: false });
        this.addStateChangeListener(uuid + '.control', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, newValue ? 'play' : 'pause');
        });
    }
}
