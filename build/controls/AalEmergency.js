"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AalEmergency = void 0;
const control_base_1 = require("./control-base");
class AalEmergency extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'status',
            'disableEndTime',
            'resetActive',
        ]);
        const statusStates = {
            '0': 'Running',
            '1': 'Triggered',
            '2': 'Reset',
            '3': 'Disabled',
        };
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'status', 'number', 'value', { states: statusStates });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'disableEndTime', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'resetActive', 'string', 'text');
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'trigger');
        this.addStateChangeListener(uuid + '.trigger', () => {
            this.sendCommand(control.uuidAction, 'trigger');
        }, { selfAck: true });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
        this.addStateChangeListener(uuid + '.quit', () => {
            this.sendCommand(control.uuidAction, 'quit');
        }, { selfAck: true });
        await this.createNumberInputStateObjectAsync(control.name, uuid, 'disable', 'level.timer');
        this.addStateChangeListener(uuid + '.disable', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, `disable/${newValue || '0'}`);
        });
        await this.loadSubControlsAsync(uuid, control);
    }
}
exports.AalEmergency = AalEmergency;
//# sourceMappingURL=AalEmergency.js.map