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
exports.Meter = void 0;
const control_base_1 = require("./control-base");
class Meter extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'sensor',
                },
                native: { control: control },
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['actual', 'total']);
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'actual', 'number', 'value.power.consumption');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'total', 'number', 'value.power.consumption');
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'reset');
            this.addStateChangeListener(uuid + '.reset', () => {
                this.sendCommand(control.uuidAction, 'reset');
            });
            if (!control.hasOwnProperty('details')) {
                return;
            }
            if (control.details.hasOwnProperty('actualFormat')) {
                yield this.updateStateObjectAsync(uuid + '.actual-formatted', {
                    name: control.name + ': formatted actual value',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                }, control.states.actual, (name, value) => __awaiter(this, void 0, void 0, function* () {
                    yield this.setFormattedStateAck(name, value, control.details.actualFormat);
                }));
            }
            if (control.details.hasOwnProperty('totalFormat')) {
                yield this.updateStateObjectAsync(uuid + '.total-formatted', {
                    name: control.name + ': formatted total value',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                }, control.states.total, (name, value) => __awaiter(this, void 0, void 0, function* () {
                    yield this.setFormattedStateAck(name, value, control.details.totalFormat);
                }));
            }
        });
    }
}
exports.Meter = Meter;
//# sourceMappingURL=Meter.js.map