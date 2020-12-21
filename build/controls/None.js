"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.None = void 0;
const control_base_1 = require("./control-base");
/**
 * This class is used if the control has no type (currently seems to be only for window monitoring).
 * It will just load the simple default states.
 */
class None extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'info',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, []);
    }
}
exports.None = None;
//# sourceMappingURL=None.js.map