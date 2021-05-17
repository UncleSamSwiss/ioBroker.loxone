"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unknown = void 0;
const control_base_1 = require("./control-base");
/**
 * This class is used if the control has an unknown type.
 * It will just load the simple default states.
 */
class Unknown extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: `Unsupported: ${control.name}`,
                role: 'info',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, []);
        await this.loadSubControlsAsync(uuid, control);
    }
}
exports.Unknown = Unknown;
//# sourceMappingURL=Unknown.js.map