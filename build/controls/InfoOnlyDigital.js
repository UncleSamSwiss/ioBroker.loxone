"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfoOnlyDigital = void 0;
const control_base_1 = require("./control-base");
class InfoOnlyDigital extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'switch',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['active']);
        if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('active')) {
            return;
        }
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'indicator');
        if (!control.hasOwnProperty('details')) {
            return;
        }
        if (control.details.hasOwnProperty('text')) {
            const text = control.details.text;
            await this.updateStateObjectAsync(uuid + '.active-text', {
                name: control.name + ': active as text',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
            }, control.states.active, async (name, value) => {
                await this.setStateAck(name, value == 1 ? text.on : text.off);
            });
        }
        if (control.details.hasOwnProperty('image')) {
            const image = control.details.text;
            await this.updateStateObjectAsync(uuid + '.active-image', {
                name: control.name + ': active as image',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
            }, control.states.active, async (name, value) => {
                await this.setStateAck(name, value == 1 ? image.on : image.off);
            });
        }
        if (control.details.hasOwnProperty('color')) {
            const color = control.details.text;
            await this.updateStateObjectAsync(uuid + '.active-color', {
                name: control.name + ': active as color',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
            }, control.states.active, async (name, value) => {
                await this.setStateAck(name, value == 1 ? color.on : color.off);
            });
        }
    }
}
exports.InfoOnlyDigital = InfoOnlyDigital;
//# sourceMappingURL=InfoOnlyDigital.js.map