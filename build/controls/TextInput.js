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
exports.TextInput = void 0;
const control_base_1 = require("./control-base");
class TextInput extends control_base_1.ControlBase {
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
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['text']);
            const common = { write: true };
            yield this.createTextInputStateObjectAsync(control.name, uuid, control.states, 'text', 'string', 'text', common);
            this.addStateChangeListener(uuid + '.text', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, (newValue || '').toString());
            });
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
                }, control.states.value, (name, value) => __awaiter(this, void 0, void 0, function* () {
                    yield this.setFormattedStateAck(name, value, control.details.format);
                }));
            }
        });
    }
    createTextInputStateObjectAsync(controlName, uuid, states, name, type, role, commonExt) {
        return __awaiter(this, void 0, void 0, function* () {
            if (states !== undefined && states.hasOwnProperty(name)) {
                let common = {
                    name: controlName + ': ' + name,
                    read: false,
                    write: true,
                    type: type,
                    role: role,
                };
                if (commonExt && typeof commonExt === 'object') {
                    common = Object.assign(Object.assign({}, common), commonExt);
                }
                yield this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, states[name], this.setStateAck.bind(this));
            }
        });
    }
}
exports.TextInput = TextInput;
//# sourceMappingURL=TextInput.js.map