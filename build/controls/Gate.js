"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gate = void 0;
const control_base_1 = require("./control-base");
class Gate extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'blind',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
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
        await this.createPercentageControlStateObjectAsync(control.name, uuid, control.states, 'position', 'level', {
            write: true,
            // TODO: re-add: smartIgnore: false,
        });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'active', 'number', 'value', { write: true, states: activeStates });
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'preventOpen', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'preventClose', 'indicator');
        this.addStateChangeListener(uuid + '.active', (oldValue, newValue) => {
            if (newValue === 1) {
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
        }, { notIfEqual: true, convertToInt: true });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'open');
        this.addStateChangeListener(uuid + '.open', () => {
            this.sendCommand(control.uuidAction, 'open');
        }, { selfAck: true });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'close');
        this.addStateChangeListener(uuid + '.close', () => {
            this.sendCommand(control.uuidAction, 'close');
        }, { selfAck: true });
        // for Alexa support:
        if (control.states.position) {
            this.addStateChangeListener(uuid + '.position', (oldValue, newValue) => {
                if (typeof oldValue !== 'number' || typeof newValue !== 'number') {
                    // This should never happen due to convertToInt flag
                    this.adapter.log.error(`Gate position is not a number`);
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
                if (newValue === 100 || newValue === 0) {
                    return;
                }
                const listenerName = 'auto';
                this.addStateEventHandler(control.states.position, async (value) => {
                    if (isOpening && value >= targetValue) {
                        this.removeStateEventHandler(control.states.position, listenerName);
                        this.sendCommand(control.uuidAction, 'close');
                    }
                    else if (!isOpening && value <= targetValue) {
                        this.removeStateEventHandler(control.states.position, listenerName);
                        this.sendCommand(control.uuidAction, 'open');
                    }
                }, listenerName);
            }, { notIfEqual: true, convertToInt: true, minInt: 0, maxInt: 100, ackTimeoutMs: 2500 });
        }
    }
}
exports.Gate = Gate;
//# sourceMappingURL=Gate.js.map