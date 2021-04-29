"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Meter = void 0;
const control_base_1 = require("./control-base");
class Meter extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['actual', 'total']);
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'actual', 'number', 'value.power.consumption');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'total', 'number', 'value.power.consumption');
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'reset');
        this.addStateChangeListener(uuid + '.reset', () => {
            this.sendCommand(control.uuidAction, 'reset');
        });
        if (!control.hasOwnProperty('details')) {
            return;
        }
        if (control.details.hasOwnProperty('actualFormat')) {
            await this.updateStateObjectAsync(uuid + '.actual-formatted', {
                name: control.name + ': formatted actual value',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                // TODO: re-add: smartIgnore: true,
            }, control.states.actual, async (name, value) => {
                await this.setFormattedStateAck(name, value, control.details.actualFormat);
            });
        }
        if (control.details.hasOwnProperty('totalFormat')) {
            await this.updateStateObjectAsync(uuid + '.total-formatted', {
                name: control.name + ': formatted total value',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                // TODO: re-add: smartIgnore: true,
            }, control.states.total, async (name, value) => {
                await this.setFormattedStateAck(name, value, control.details.totalFormat);
            });
        }
    }
}
exports.Meter = Meter;
//# sourceMappingURL=Meter.js.map