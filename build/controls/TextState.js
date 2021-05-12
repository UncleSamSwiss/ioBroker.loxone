"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextState = void 0;
const control_base_1 = require("./control-base");
class TextState extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'info',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['textAndIcon']);
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'textAndIcon', 'string', 'text');
    }
}
exports.TextState = TextState;
//# sourceMappingURL=TextState.js.map