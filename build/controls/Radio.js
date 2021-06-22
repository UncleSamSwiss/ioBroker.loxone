"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Radio = void 0;
const control_base_1 = require("./control-base");
class Radio extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'button',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['activeOutput']);
        let states = {};
        if (control.details.hasOwnProperty('allOff')) {
            states['0'] = control.details.allOff;
        }
        if (control.details.hasOwnProperty('outputs')) {
            states = { ...states, ...control.details.outputs };
        }
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'activeOutput', 'number', 'level', {
            states,
            write: true,
        });
        this.addStateChangeListener(uuid + '.activeOutput', (oldValue, newValue) => {
            if (newValue == oldValue) {
                return;
            }
            const value = this.convertStateToInt(newValue);
            if (value === 0) {
                this.sendCommand(control.uuidAction, 'reset');
            }
            else if (states.hasOwnProperty(value)) {
                this.sendCommand(control.uuidAction, value.toString());
            }
        });
    }
}
exports.Radio = Radio;
//# sourceMappingURL=Radio.js.map