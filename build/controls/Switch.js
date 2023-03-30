"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Switch = void 0;
const control_base_1 = require("./control-base");
class Switch extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'switch',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['active']);
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'switch', {
            write: true,
            // TODO: re-add: smartIgnore: type == 'channel',
        });
        this.addStateChangeListener(uuid + '.active', (oldValue, newValue) => {
            if (newValue) {
                this.sendCommand(control.uuidAction, 'on');
            }
            else {
                this.sendCommand(control.uuidAction, 'off');
            }
        }, { notIfEqual: true });
    }
}
exports.Switch = Switch;
//# sourceMappingURL=Switch.js.map