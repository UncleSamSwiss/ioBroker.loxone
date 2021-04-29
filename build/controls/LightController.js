"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightController = void 0;
const control_base_1 = require("./control-base");
class LightController extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['activeScene', 'sceneList']);
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'activeScene', 'number', 'level', { write: true });
        this.addStateChangeListener(uuid + '.activeScene', (oldValue, newValue) => {
            newValue = this.convertStateToInt(newValue);
            if (newValue === 9) {
                this.sendCommand(control.uuidAction, 'on');
            }
            else {
                this.sendCommand(control.uuidAction, newValue.toString());
            }
        });
        if (control.states.hasOwnProperty('sceneList')) {
            await this.updateStateObjectAsync(uuid + '.sceneList', {
                name: control.name + ': sceneList',
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                // TODO: re-add: smartIgnore: true,
            }, control.states.sceneList, async (name, value) => {
                // weird documentation: they say it's 'text' within the struct, but I get the value directly; let's support both
                if (value.hasOwnProperty('text')) {
                    await this.setStateAck(name, value.text.split(','));
                }
                else {
                    await this.setStateAck(name, value.toString().split(','));
                }
            });
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
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'control');
        this.addStateChangeListener(uuid + '.control', (oldValue, newValue) => {
            if (newValue) {
                this.sendCommand(control.uuidAction, 'on');
            }
            else {
                this.sendCommand(control.uuidAction, '0');
            }
        });
        // TODO: currently we don't support scene modifications ("learn" and "delete" commands),
        // IMHO this should be done by the user through the Loxone Web interface
        await this.loadSubControlsAsync(uuid, control);
    }
}
exports.LightController = LightController;
//# sourceMappingURL=LightController.js.map