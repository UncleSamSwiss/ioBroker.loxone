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
exports.CentralGate = void 0;
const ControlBase_1 = require("./ControlBase");
class CentralGate extends ControlBase_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'blind',
                },
                native: control,
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'open');
            this.addStateChangeListener(uuid + '.open', () => {
                this.sendCommand(control.uuidAction, 'open');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'close');
            this.addStateChangeListener(uuid + '.close', () => {
                this.sendCommand(control.uuidAction, 'close');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'stop');
            this.addStateChangeListener(uuid + '.stop', () => {
                this.sendCommand(control.uuidAction, 'stop');
            });
        });
    }
}
exports.CentralGate = CentralGate;
//# sourceMappingURL=CentralGate.js.map