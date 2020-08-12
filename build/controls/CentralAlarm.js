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
exports.CentralAlarm = void 0;
const ControlBase_1 = require("./ControlBase");
class CentralAlarm extends ControlBase_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'alarm',
                },
                native: control,
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'armed', { smartIgnore: false });
            this.addStateChangeListener(uuid + '.armed', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, newValue ? 'on' : 'off');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'delayedOn');
            this.addStateChangeListener(uuid + '.delayedOn', () => {
                this.sendCommand(control.uuidAction, 'delayedon');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
            this.addStateChangeListener(uuid + '.quit', () => {
                this.sendCommand(control.uuidAction, 'quit');
            });
        });
    }
}
exports.CentralAlarm = CentralAlarm;
//# sourceMappingURL=CentralAlarm.js.map