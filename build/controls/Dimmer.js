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
exports.Dimmer = void 0;
const control_base_1 = require("./control-base");
class Dimmer extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'light',
                },
                native: control,
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['position', 'min', 'max', 'step']);
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'position', 'number', 'level.dimmer', { write: true });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'min', 'number', 'value');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'max', 'number', 'value');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'step', 'number', 'value');
            this.addStateChangeListener(uuid + '.position', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, this.convertStateToInt(newValue).toString());
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'on');
            this.addStateChangeListener(uuid + '.on', () => {
                this.sendCommand(control.uuidAction, 'on');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'off');
            this.addStateChangeListener(uuid + '.off', () => {
                this.sendCommand(control.uuidAction, 'off');
            });
        });
    }
}
exports.Dimmer = Dimmer;
//# sourceMappingURL=Dimmer.js.map