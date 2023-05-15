"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EIBDimmer = void 0;
const control_base_1 = require("./control-base");
class EIBDimmer extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['position']);
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'position', 'number', 'level.dimmer', { write: true });
        this.addStateChangeListener(uuid + '.position', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, this.convertStateToInt(newValue).toString());
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'on');
        this.addStateChangeListener(uuid + '.on', () => {
            this.sendCommand(control.uuidAction, 'on');
        }, { selfAck: true });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'off');
        this.addStateChangeListener(uuid + '.off', () => {
            this.sendCommand(control.uuidAction, 'off');
        }, { selfAck: true });
    }
}
exports.EIBDimmer = EIBDimmer;
//# sourceMappingURL=EIBDimmer.js.map