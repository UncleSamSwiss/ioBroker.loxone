"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceDetector = void 0;
const control_base_1 = require("./control-base");
class PresenceDetector extends control_base_1.ControlBase {
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
            'active',
            'locked',
            'events',
            'infoText',
        ]);
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'locked', 'indicator');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'events', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'infoText', 'string', 'text');
        await this.loadSubControlsAsync(uuid, control);
    }
}
exports.PresenceDetector = PresenceDetector;
//# sourceMappingURL=PresenceDetector.js.map