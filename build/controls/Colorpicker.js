"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Colorpicker = void 0;
const ColorpickerBase_1 = require("./ColorpickerBase");
class Colorpicker extends ColorpickerBase_1.ColorpickerBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light.color.rgb',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['color', 'favorites']);
        await this.loadColorPickerControlBaseAsync(uuid, control);
    }
}
exports.Colorpicker = Colorpicker;
//# sourceMappingURL=Colorpicker.js.map