"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentralLightController = void 0;
const control_base_1 = require("./control-base");
class CentralLightController extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light',
            },
            native: { control: control },
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'control');
        this.addStateChangeListener(uuid + '.control', (oldValue, newValue) => {
            if (newValue) {
                this.sendCommand(control.uuidAction, 'on');
            }
            else {
                this.sendCommand(control.uuidAction, 'reset');
            }
        });
    }
}
exports.CentralLightController = CentralLightController;
//# sourceMappingURL=CentralLightController.js.map