import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for the CentralAudioZone control.
 */
export class CentralAudioZone extends ControlBase {
    /**
     * Loads the control and sets up state objects and event handlers.
     *
     * @param type The type of the control ('device' or 'channel').
     * @param uuid The unique identifier of the control.
     * @param control The control data from the structure file.
     */
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
            `${uuid}.control`,
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, newValue ? 'play' : 'pause');
            },
            { selfAck: true },
        );
    }
}
