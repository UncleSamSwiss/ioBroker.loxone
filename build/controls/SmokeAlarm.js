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
exports.SmokeAlarm = void 0;
const control_base_1 = require("./control-base");
class SmokeAlarm extends control_base_1.ControlBase {
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
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
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
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevel', 'number', 'value', { states: levelStates });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevelDelay', 'number', 'value.interval');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevelDelayTotal', 'number', 'value.interval');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'level', 'number', 'value', {
                states: levelStates,
            });
            yield this.createListControlStateObjectAsync(control.name, uuid, control.states, 'sensors');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'acousticAlarm', 'indicator');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'testAlarm', 'indicator');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'alarmCause', 'number', 'value', { states: causeStates });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'startTime', 'string', 'value.datetime');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'timeServiceMode', 'number', 'level.interval', { write: true });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'mute');
            this.addStateChangeListener(uuid + '.mute', () => {
                this.sendCommand(control.uuidAction, 'mute');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
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
        });
    }
}
exports.SmokeAlarm = SmokeAlarm;
//# sourceMappingURL=SmokeAlarm.js.map