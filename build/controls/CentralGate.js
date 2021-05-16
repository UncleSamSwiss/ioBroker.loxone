"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentralGate = void 0;
const control_base_1 = require("./control-base");
class CentralGate extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'blind',
            },
            native: { control },
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'open');
        this.addStateChangeListener(uuid + '.open', () => {
            this.sendCommand(control.uuidAction, 'open');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'close');
        this.addStateChangeListener(uuid + '.close', () => {
            this.sendCommand(control.uuidAction, 'close');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'stop');
        this.addStateChangeListener(uuid + '.stop', () => {
            this.sendCommand(control.uuidAction, 'stop');
        });
    }
}
exports.CentralGate = CentralGate;
//# sourceMappingURL=CentralGate.js.map