"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentralAlarm = void 0;
const control_base_1 = require("./control-base");
class CentralAlarm extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm',
            },
            native: { control },
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'armed');
        this.addStateChangeListener(uuid + '.armed', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, newValue ? 'on' : 'off');
        }, { selfAck: true });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'delayedOn');
        this.addStateChangeListener(uuid + '.delayedOn', () => {
            this.sendCommand(control.uuidAction, 'delayedon');
        }, { selfAck: true });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
        this.addStateChangeListener(uuid + '.quit', () => {
            this.sendCommand(control.uuidAction, 'quit');
        }, { selfAck: true });
    }
}
exports.CentralAlarm = CentralAlarm;
//# sourceMappingURL=CentralAlarm.js.map