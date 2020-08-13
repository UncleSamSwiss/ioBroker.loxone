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
exports.InfoOnlyDigital = void 0;
const control_base_1 = require("./control-base");
class InfoOnlyDigital extends control_base_1.ControlBase {
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
            if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('active')) {
                return;
            }
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'active', 'indicator');
            if (!control.hasOwnProperty('details')) {
                return;
            }
            if (control.details.hasOwnProperty('text')) {
                yield this.updateStateObjectAsync(uuid + '.active-text', {
                    name: control.name + ': active as text',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    smartIgnore: true,
                }, control.states.active, (name, value) => {
                    this.setStateAck(name, value == 1 ? control.details.text.on : control.details.text.off);
                });
            }
            if (control.details.hasOwnProperty('image')) {
                yield this.updateStateObjectAsync(uuid + '.active-image', {
                    name: control.name + ': active as image',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    smartIgnore: true,
                }, control.states.active, (name, value) => {
                    this.setStateAck(name, value == 1 ? control.details.image.on : control.details.image.off);
                });
            }
            if (control.details.hasOwnProperty('color')) {
                yield this.updateStateObjectAsync(uuid + '.active-color', {
                    name: control.name + ': active as color',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    smartIgnore: true,
                }, control.states.active, (name, value) => {
                    this.setStateAck(name, value == 1 ? control.details.color.on : control.details.color.off);
                });
            }
        });
    }
}
exports.InfoOnlyDigital = InfoOnlyDigital;
//# sourceMappingURL=InfoOnlyDigital.js.map