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
exports.Switch = void 0;
const control_base_1 = require("./control-base");
class Switch extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'switch',
                },
                native: control,
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['active']);
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'switch', {
                write: true,
                smartIgnore: type == 'channel',
            });
            this.addStateChangeListener(uuid + '.active', (oldValue, newValue) => {
                if (newValue == oldValue) {
                    return;
                }
                else if (newValue) {
                    this.sendCommand(control.uuidAction, 'on');
                }
                else {
                    this.sendCommand(control.uuidAction, 'off');
                }
            });
        });
    }
}
exports.Switch = Switch;
//# sourceMappingURL=Switch.js.map