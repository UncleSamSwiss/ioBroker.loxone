"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alarm = void 0;
const control_base_1 = require("./control-base");
class Alarm extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'armed',
            'nextLevel',
            'nextLevelDelay',
            'nextLevelDelayTotal',
            'level',
            'startTime',
            'armedDelay',
            'armedDelayTotal',
            'sensors',
            'disabledMove',
        ]);
        const levelStates = {
            '0': 'None',
            '1': 'Silent',
            '2': 'Acustic',
            '3': 'Optical',
            '4': 'Internal',
            '5': 'External',
            '6': 'Remote',
        };
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'armed', 'switch', {
            write: true,
            // TODO: re-add: smartIgnore: false,
        });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevel', 'number', 'value', { states: levelStates });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevelDelay', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevelDelayTotal', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'level', 'number', 'value', {
            states: levelStates,
        });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'startTime', 'string', 'value.datetime');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'armedDelay', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'armedDelayTotal', 'number', 'value.interval');
        await this.createListControlStateObjectAsync(control.name, uuid, control.states, 'sensors');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'disabledMove', 'switch', {
            write: true,
        });
        this.addStateChangeListener(uuid + '.armed', (oldValue, newValue) => {
            if (newValue) {
                this.sendCommand(control.uuidAction, 'on');
            }
            else {
                this.sendCommand(control.uuidAction, 'off');
            }
        });
        this.addStateChangeListener(uuid + '.disabledMove', (oldValue, newValue) => {
            if (newValue) {
                this.sendCommand(control.uuidAction, 'dismv/0');
            }
            else {
                this.sendCommand(control.uuidAction, 'dismv/1');
            }
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'delayedOn');
        this.addStateChangeListener(uuid + '.delayedOn', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'delayedon/' + (newValue ? 1 : 0));
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
        this.addStateChangeListener(uuid + '.quit', () => {
            this.sendCommand(control.uuidAction, 'quit');
        });
        // subControls are not needed because "sensors" already contains the information from the tracker
    }
}
exports.Alarm = Alarm;
//# sourceMappingURL=Alarm.js.map