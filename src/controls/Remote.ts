'use strict';
import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

/**
 * Remote aka. Media Controller
 */
export class Remote extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        this.adapter.log.debug('Remote controls: ' + JSON.stringify(control));
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'media',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['jLocked', 'mode']);

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'mode', 'string', 'text', {
            write: true,
        });
        this.addStateChangeListener(uuid + '.mode', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            if (newValue && newValue !== '0') {
                // Send the actual mode number
                this.sendCommand(control.uuidAction, `mode/${newValue}`);
            } else {
                // Sending mode zero is not supported so sent reset/all off
                this.sendCommand(control.uuidAction, 'reset');
            }
        });
    }
}
