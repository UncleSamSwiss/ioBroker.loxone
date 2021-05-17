"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimedSwitch = void 0;
const control_base_1 = require("./control-base");
class TimedSwitch extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'switch',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'deactivationDelayTotal',
            'deactivationDelay',
        ]);
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'deactivationDelayTotal', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'deactivationDelay', 'number', 'value.interval');
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'on');
        this.addStateChangeListener(uuid + '.on', () => {
            this.sendCommand(control.uuidAction, 'on');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'off');
        this.addStateChangeListener(uuid + '.off', () => {
            this.sendCommand(control.uuidAction, 'off');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'pulse');
        this.addStateChangeListener(uuid + '.pulse', () => {
            this.sendCommand(control.uuidAction, 'pulse');
        });
    }
}
exports.TimedSwitch = TimedSwitch;
//# sourceMappingURL=TimedSwitch.js.map