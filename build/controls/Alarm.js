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
exports.Alarm = void 0;
const control_base_1 = require("./control-base");
class Alarm extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'alarm',
                },
                native: { control: control },
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
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
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'armed', 'switch', {
                write: true,
            });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevel', 'number', 'value', { states: levelStates });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevelDelay', 'number', 'value.interval');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'nextLevelDelayTotal', 'number', 'value.interval');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'level', 'number', 'value', {
                states: levelStates,
            });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'startTime', 'string', 'value.datetime');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'armedDelay', 'number', 'value.interval');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'armedDelayTotal', 'number', 'value.interval');
            yield this.createListControlStateObjectAsync(control.name, uuid, control.states, 'sensors');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'disabledMove', 'switch', {
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
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'delayedOn');
            this.addStateChangeListener(uuid + '.delayedOn', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'delayedon/' + (newValue ? 1 : 0));
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'quit');
            this.addStateChangeListener(uuid + '.quit', () => {
                this.sendCommand(control.uuidAction, 'quit');
            });
            // subControls are not needed because "sensors" already contains the information from the tracker
        });
    }
}
exports.Alarm = Alarm;
//# sourceMappingURL=Alarm.js.map