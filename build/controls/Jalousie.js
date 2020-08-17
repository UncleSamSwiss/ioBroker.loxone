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
exports.Jalousie = void 0;
const control_base_1 = require("./control-base");
class Jalousie extends control_base_1.ControlBase {
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
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
                'up',
                'down',
                'position',
                'shadePosition',
                'safetyActive',
                'autoAllowed',
                'autoActive',
                'locked',
            ]);
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'up', 'indicator', {
                write: true,
            });
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'down', 'indicator', {
                write: true,
            });
            yield this.createPercentageControlStateObjectAsync(control.name, uuid, control.states, 'position', 'level.blind', {
                write: true,
            });
            yield this.createPercentageControlStateObjectAsync(control.name, uuid, control.states, 'shadePosition', 'level');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'safetyActive', 'indicator');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'autoAllowed', 'indicator');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'autoActive', 'indicator', {
                write: true,
            });
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'locked', 'indicator');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'infoText', 'string', 'text');
            this.addStateChangeListener(uuid + '.up', (oldValue, newValue) => {
                if (newValue) {
                    this.sendCommand(control.uuidAction, 'up');
                }
                else {
                    this.sendCommand(control.uuidAction, 'UpOff');
                }
            });
            this.addStateChangeListener(uuid + '.down', (oldValue, newValue) => {
                if (newValue) {
                    this.sendCommand(control.uuidAction, 'down');
                }
                else {
                    this.sendCommand(control.uuidAction, 'DownOff');
                }
            });
            this.addStateChangeListener(uuid + '.autoActive', (oldValue, newValue) => {
                if (newValue == oldValue) {
                    return;
                }
                else if (newValue) {
                    this.sendCommand(control.uuidAction, 'auto');
                }
                else {
                    this.sendCommand(control.uuidAction, 'NoAuto');
                }
            });
            // for Alexa support:
            if (control.states.position) {
                this.addStateChangeListener(uuid + '.position', (oldValue, newValue) => {
                    oldValue = this.convertStateToInt(oldValue);
                    newValue = Math.max(0, Math.min(100, this.convertStateToInt(newValue))); // 0 <= newValue <= 100
                    if (oldValue == newValue) {
                        return;
                    }
                    if (newValue == 100) {
                        this.sendCommand(control.uuidAction, 'FullDown');
                        return;
                    }
                    if (newValue === 0) {
                        this.sendCommand(control.uuidAction, 'FullUp');
                        return;
                    }
                    let targetValue;
                    let isGoingDown;
                    if (oldValue < newValue) {
                        targetValue = (newValue - 5) / 100;
                        this.sendCommand(control.uuidAction, 'down');
                        isGoingDown = true;
                    }
                    else {
                        targetValue = (newValue + 5) / 100;
                        this.sendCommand(control.uuidAction, 'up');
                        isGoingDown = false;
                    }
                    const listenerName = 'auto';
                    this.addStateEventHandler(control.states.position, (value) => {
                        if (isGoingDown && value >= targetValue) {
                            this.removeStateEventHandler(control.states.position, listenerName);
                            this.sendCommand(control.uuidAction, 'DownOff');
                        }
                        else if (!isGoingDown && value <= targetValue) {
                            this.removeStateEventHandler(control.states.position, listenerName);
                            this.sendCommand(control.uuidAction, 'UpOff');
                        }
                    }, listenerName);
                });
            }
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
exports.Jalousie = Jalousie;
//# sourceMappingURL=Jalousie.js.map