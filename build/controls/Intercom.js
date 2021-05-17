"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Intercom = void 0;
const control_base_1 = require("./control-base");
class Intercom extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'info',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'bell',
            'lastBellEvents',
            'version',
        ]);
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'bell', 'indicator');
        await this.createListControlStateObjectAsync(control.name, uuid, control.states, 'lastBellEvents');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'version', 'string', 'text');
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'answer');
        this.addStateChangeListener(uuid + '.answer', () => {
            this.sendCommand(control.uuidAction, 'answer');
        });
        await this.loadSubControlsAsync(uuid, control);
    }
}
exports.Intercom = Intercom;
//# sourceMappingURL=Intercom.js.map