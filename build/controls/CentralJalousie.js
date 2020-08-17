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
exports.CentralJalousie = void 0;
const control_base_1 = require("./control-base");
class CentralJalousie extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'blind',
                },
                native: { control: control },
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'autoActive');
            this.addStateChangeListener(uuid + '.autoActive', (oldValue, newValue) => {
                if (newValue) {
                    this.sendCommand(control.uuidAction, 'auto');
                }
                else {
                    this.sendCommand(control.uuidAction, 'NoAuto');
                }
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'fullUp');
            this.addStateChangeListener(uuid + '.fullUp', () => {
                this.sendCommand(control.uuidAction, 'FullUp');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'fullDown');
            this.addStateChangeListener(uuid + '.fullDown', () => {
                this.sendCommand(control.uuidAction, 'FullDown');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'shade');
            this.addStateChangeListener(uuid + '.shade', () => {
                this.sendCommand(control.uuidAction, 'shade');
            });
        });
    }
}
exports.CentralJalousie = CentralJalousie;
//# sourceMappingURL=CentralJalousie.js.map