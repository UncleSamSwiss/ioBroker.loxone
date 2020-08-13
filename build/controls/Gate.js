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
exports.Gate = void 0;
const control_base_1 = require("./control-base");
class Gate extends control_base_1.ControlBase {
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
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
                'position',
                'active',
                'preventOpen',
                'preventClose',
            ]);
            const activeStates = {
                '-1': 'close',
                '0': 'not moving',
                '1': 'open',
            };
            yield this.createPercentageControlStateObjectAsync(control.name, uuid, control.states, 'position', 'level', {
                write: true,
            });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'active', 'number', 'value', { write: true, states: activeStates });
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'preventOpen', 'indicator');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'preventClose', 'indicator');
            this.addStateChangeListener(uuid + '.active', (oldValue, newValue) => {
                oldValue = this.convertStateToInt(oldValue);
                newValue = this.convertStateToInt(newValue);
                if (newValue === oldValue) {
                    return;
                }
                else if (newValue === 1) {
                    if (oldValue === -1) {
                        // open twice because we are currently closing
                        this.sendCommand(control.uuidAction, 'open');
                    }
                    this.sendCommand(control.uuidAction, 'open');
                }
                else if (newValue === -1) {
                    if (oldValue === 1) {
                        // close twice because we are currently opening
                        this.sendCommand(control.uuidAction, 'close');
                    }
                    this.sendCommand(control.uuidAction, 'close');
                }
                else if (newValue === 0) {
                    if (oldValue === 1) {
                        this.sendCommand(control.uuidAction, 'close');
                    }
                    else if (oldValue === -1) {
                        this.sendCommand(control.uuidAction, 'open');
                    }
                }
            });
            // for Alexa support:
            if (control.states.position) {
                this.addStateChangeListener(uuid + '.position', (oldValue, newValue) => {
                    newValue = Math.max(0, Math.min(100, this.convertStateToInt(newValue))); // 0 <= newValue <= 100
                    oldValue = this.convertStateToInt(oldValue);
                    if (oldValue == newValue) {
                        return;
                    }
                    let targetValue;
                    let isOpening;
                    if (oldValue < newValue) {
                        targetValue = (newValue - 1) / 100;
                        this.sendCommand(control.uuidAction, 'open');
                        isOpening = true;
                    }
                    else {
                        targetValue = (newValue + 1) / 100;
                        this.sendCommand(control.uuidAction, 'close');
                        isOpening = false;
                    }
                    if (newValue == 100 || newValue === 0) {
                        return;
                    }
                    const listenerName = 'auto';
                    this.addStateEventHandler(control.states.position, (value) => {
                        if (isOpening && value >= targetValue) {
                            this.removeStateEventHandler(control.states.position, listenerName);
                            this.sendCommand(control.uuidAction, 'close');
                        }
                        else if (!isOpening && value <= targetValue) {
                            this.removeStateEventHandler(control.states.position, listenerName);
                            this.sendCommand(control.uuidAction, 'open');
                        }
                    }, listenerName);
                });
            }
        });
    }
}
exports.Gate = Gate;
//# sourceMappingURL=Gate.js.map