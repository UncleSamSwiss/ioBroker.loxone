"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Slider = void 0;
const control_base_1 = require("./control-base");
class Slider extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value', 'error']);
        const common = { write: true };
        if (control.hasOwnProperty('details')) {
            common.min = control.details.min;
            common.max = control.details.max;
        }
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'number', 'level', common);
        this.addStateChangeListener(uuid + '.value', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, (newValue || '0').toString());
        });
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'error', 'indicator.maintenance');
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
exports.Slider = Slider;
//# sourceMappingURL=Slider.js.map