"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorPickerV2 = void 0;
const ColorpickerBase_1 = require("./ColorpickerBase");
class ColorPickerV2 extends ColorpickerBase_1.ColorpickerBase {
    async loadAsync(type, uuid, control) {
        if (control.details.pickerType != 'Rgb') {
            throw 'Unsupported color picker type: ' + control.details.pickerType;
        }
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light.color.rgb',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'color',
            'sequence',
            'sequenceColorIdx',
        ]);
        await this.loadColorPickerControlBaseAsync(uuid, control);
    }
}
exports.ColorPickerV2 = ColorPickerV2;
//# sourceMappingURL=ColorPickerV2.js.map