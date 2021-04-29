"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextInput = void 0;
const control_base_1 = require("./control-base");
class TextInput extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['text']);
        const common = { write: true };
        await this.createTextInputStateObjectAsync(control.name, uuid, control.states, 'text', 'string', 'text', common);
        this.addStateChangeListener(uuid + '.text', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, (newValue || '').toString());
        });
        if (!control.hasOwnProperty('details')) {
            return;
        }
        if (control.details.hasOwnProperty('format')) {
            await this.updateStateObjectAsync(uuid + '.value-formatted', {
                name: control.name + ': formatted value',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                // TODO: re-add: smartIgnore: true,
            }, control.states.value, async (name, value) => {
                await this.setFormattedStateAck(name, value, control.details.format);
            });
        }
    }
    async createTextInputStateObjectAsync(controlName, uuid, states, name, type, role, commonExt) {
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
                read: false,
                write: true,
                type: type,
                role: role,
                //smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, states[name], this.setStateAck.bind(this));
        }
    }
}
exports.TextInput = TextInput;
//# sourceMappingURL=TextInput.js.map