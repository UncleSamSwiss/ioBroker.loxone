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
exports.Slider = void 0;
const control_base_1 = require("./control-base");
class Slider extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'sensor',
                },
                native: control,
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['value', 'error']);
            const common = { write: true };
            if (control.hasOwnProperty('details')) {
                common.min = control.details.min;
                common.max = control.details.max;
            }
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'number', 'level', common);
            this.addStateChangeListener(uuid + '.value', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, (newValue || '').toString());
            });
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'error', 'indicator.maintenance');
            if (!control.hasOwnProperty('details')) {
                return;
            }
            if (control.details.hasOwnProperty('format')) {
                yield this.updateStateObjectAsync(uuid + '.value-formatted', {
                    name: control.name + ': formatted value',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                }, control.states.value, (name, value) => {
                    this.setFormattedStateAck(name, value, control.details.format);
                });
            }
        });
    }
}
exports.Slider = Slider;
//# sourceMappingURL=Slider.js.map