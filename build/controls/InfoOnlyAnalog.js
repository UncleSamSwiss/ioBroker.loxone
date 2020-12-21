"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfoOnlyAnalog = void 0;
const control_base_1 = require("./control-base");
class InfoOnlyAnalog extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value']);
        if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('value')) {
            return;
        }
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'number', 'value');
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
            }, control.states.value, async (name, value) => {
                await this.setFormattedStateAck(name, value, control.details.format);
            });
        }
    }
}
exports.InfoOnlyAnalog = InfoOnlyAnalog;
//# sourceMappingURL=InfoOnlyAnalog.js.map