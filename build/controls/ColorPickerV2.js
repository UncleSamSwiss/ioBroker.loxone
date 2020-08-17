"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorPickerV2 = void 0;
const ColorpickerBase_1 = require("./ColorpickerBase");
class ColorPickerV2 extends ColorpickerBase_1.ColorpickerBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            if (control.details.pickerType != 'Rgb') {
                throw 'Unsupported color picker type: ' + control.details.pickerType;
            }
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'light.color.rgb',
                },
                native: { control: control },
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
                'color',
                'sequence',
                'sequenceColorIdx',
            ]);
            yield this.loadColorPickerControlBaseAsync(uuid, control);
        });
    }
}
exports.ColorPickerV2 = ColorPickerV2;
//# sourceMappingURL=ColorPickerV2.js.map