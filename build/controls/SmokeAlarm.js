"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmokeAlarm = void 0;
const control_base_1 = require("./control-base");
class SmokeAlarm extends control_base_1.ControlBase {
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
            'nextLevel',
            'nextLevelDelay',
            'nextLevelDelayTotal',
            'level',
            'sensors',
            'acousticAlarm',
            'testAlarm',
            'alarmCause',
            'startTime',
            'timeServiceMode',
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
        const causeStates = {
            '0': 'None',
            '1': 'Smoke',
            '2': 'Water',
            '3': 'Smoke & Water',
            '4': 'Temperature',
            '5': 'Temperature & Smoke',
            '6': 'Temperature & Water',
            '7': 'Temperature & Smoke & Water',
            '8': 'Arc Fault',
            '9': 'Arc Fault & Smoke',
            '10': 'Arc Fault & Water',
            '11': 'Arc Fault & Smoke & Water',
            '12': 'Arc Fault & Temperature',
            '13': 'Arc Fault & Temperature & Smoke',
            '14': 'Arc Fault & Temperature & Water',
            '15': 'Arc Fault & Temperature & Smoke & Water',
        };
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevel', 'number', 'value', { states: levelStates });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevelDelay', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevelDelayTotal', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'level', 'number', 'value', {
            states: levelStates,
        });
        await this.createListControlStateObjectAsync(control.name, uuid, control.states, 'sensors');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'acousticAlarm', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'testAlarm', 'indicator');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'alarmCause', 'number', 'value', { states: causeStates });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'startTime', 'string', 'value.datetime');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'timeServiceMode', 'number', 'level.interval', { write: true });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'mute');
        this.addStateChangeListener(uuid + '.mute', () => {
            this.sendCommand(control.uuidAction, 'mute');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
        this.addStateChangeListener(uuid + '.quit', () => {
            this.sendCommand(control.uuidAction, 'quit');
        });
        this.addStateChangeListener(uuid + '.timeServiceMode', (oldValue, newValue) => {
            newValue = this.convertStateToInt(newValue);
            if (newValue === undefined || newValue < 0) {
                return;
            }
            this.sendCommand(control.uuidAction, 'servicemode/' + newValue);
        });
        // subControls are not needed because "sensors" already contains the information from the tracker
    }
}
exports.SmokeAlarm = SmokeAlarm;
//# sourceMappingURL=SmokeAlarm.js.map