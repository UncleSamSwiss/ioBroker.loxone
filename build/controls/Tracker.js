"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracker = void 0;
const control_base_1 = require("./control-base");
class Tracker extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'info',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['entries']);
        await this.createListControlStateObjectAsync(control.name, uuid, control.states, 'entries');
    }
}
exports.Tracker = Tracker;
//# sourceMappingURL=Tracker.js.map