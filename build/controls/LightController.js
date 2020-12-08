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
exports.LightController = void 0;
const control_base_1 = require("./control-base");
class LightController extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'light',
                },
                native: { control: control },
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['activeScene', 'sceneList']);
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'activeScene', 'number', 'level', { write: true });
            this.addStateChangeListener(uuid + '.activeScene', (oldValue, newValue) => {
                newValue = this.convertStateToInt(newValue);
                if (newValue === 9) {
                    this.sendCommand(control.uuidAction, 'on');
                }
                else {
                    this.sendCommand(control.uuidAction, newValue.toString());
                }
            });
            if (control.states.hasOwnProperty('sceneList')) {
                yield this.updateStateObjectAsync(uuid + '.sceneList', {
                    name: control.name + ': sceneList',
                    read: true,
                    write: false,
                    type: 'array',
                    role: 'list',
                }, control.states.sceneList, (name, value) => {
                    // weird documentation: they say it's 'text' within the struct, but I get the value directly; let's support both
                    if (value.hasOwnProperty('text')) {
                        return this.setStateAck(name, value.text.split(','));
                    }
                    return this.setStateAck(name, value.toString().split(','));
                });
            }
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'plus');
            this.addStateChangeListener(uuid + '.plus', () => {
                this.sendCommand(control.uuidAction, 'plus');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'minus');
            this.addStateChangeListener(uuid + '.minus', () => {
                this.sendCommand(control.uuidAction, 'minus');
            });
            // for Alexa support:
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'control');
            this.addStateChangeListener(uuid + '.control', (oldValue, newValue) => {
                if (newValue) {
                    this.sendCommand(control.uuidAction, 'on');
                }
                else {
                    this.sendCommand(control.uuidAction, '0');
                }
            });
            // TODO: currently we don't support scene modifications ("learn" and "delete" commands),
            // IMHO this should be done by the user through the Loxone Web interface
            yield this.loadSubControlsAsync(uuid, control);
        });
    }
}
exports.LightController = LightController;
//# sourceMappingURL=LightController.js.map