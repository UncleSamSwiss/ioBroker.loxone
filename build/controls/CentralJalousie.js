"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentralJalousie = void 0;
const control_base_1 = require("./control-base");
class CentralJalousie extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'blind',
            },
            native: { control: control },
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'autoActive');
        this.addStateChangeListener(uuid + '.autoActive', (oldValue, newValue) => {
            if (newValue) {
                this.sendCommand(control.uuidAction, 'auto');
            }
            else {
                this.sendCommand(control.uuidAction, 'NoAuto');
            }
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'fullUp');
        this.addStateChangeListener(uuid + '.fullUp', () => {
            this.sendCommand(control.uuidAction, 'FullUp');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'fullDown');
        this.addStateChangeListener(uuid + '.fullDown', () => {
            this.sendCommand(control.uuidAction, 'FullDown');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'shade');
        this.addStateChangeListener(uuid + '.shade', () => {
            this.sendCommand(control.uuidAction, 'shade');
        });
    }
}
exports.CentralJalousie = CentralJalousie;
//# sourceMappingURL=CentralJalousie.js.map