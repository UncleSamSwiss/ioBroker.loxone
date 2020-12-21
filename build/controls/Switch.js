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
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['active']);
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'switch', {
            write: true,
        });
        this.addStateChangeListener(uuid + '.active', (oldValue, newValue) => {
            if (newValue == oldValue) {
                return;
            }
            else if (newValue) {
                this.sendCommand(control.uuidAction, 'on');
            }
            else {
                this.sendCommand(control.uuidAction, 'off');
            }
        });
    }
}
exports.Switch = Switch;
//# sourceMappingURL=Switch.js.map