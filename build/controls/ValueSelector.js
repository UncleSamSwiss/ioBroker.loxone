"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueSelector = void 0;
const control_base_1 = require("./control-base");
class ValueSelector extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value', 'min', 'max', 'step']);
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'number', 'level', {
            write: true,
        });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'min', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'max', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'step', 'number', 'value');
        this.addStateChangeListener(uuid + '.value', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, this.convertStateToInt(newValue).toString());
        });
    }
}
exports.ValueSelector = ValueSelector;
//# sourceMappingURL=ValueSelector.js.map