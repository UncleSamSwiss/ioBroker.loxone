import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

/**
 * Handler for InfoOnlyDigital controls.
 */
export class InfoOnlyDigital extends ControlBase {
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
                role: 'switch',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['active']);

        if (!('states' in control) || !('active' in control.states)) {
            return;
        }

        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'indicator');

        if (!('details' in control)) {
            return;
        }

        if ('text' in control.details) {
            const text: any = control.details.text;
            await this.updateStateObjectAsync(
                `${uuid}.active-text`,
                {
                    name: `${control.name}: active as text`,
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.active,
                async (name: string, value: any) => {
                    await this.setStateAck(name, value == 1 ? text.on : text.off);
                },
            );
        }

        if ('image' in control.details) {
            const image: any = control.details.image;
            await this.updateStateObjectAsync(
                `${uuid}.active-image`,
                {
                    name: `${control.name}: active as image`,
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.active,
                async (name: string, value: any) => {
                    await this.setStateAck(name, value == 1 ? image.on : image.off);
                },
            );
        }

        if ('color' in control.details) {
            const color: any = control.details.color;
            await this.updateStateObjectAsync(
                `${uuid}.active-color`,
                {
                    name: `${control.name}: active as color`,
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.active,
                async (name: string, value: any) => {
                    await this.setStateAck(name, value == 1 ? color.on : color.off);
                },
            );
        }
    }
}
