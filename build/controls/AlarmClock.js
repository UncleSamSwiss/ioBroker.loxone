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
exports.AlarmClock = void 0;
const ControlBase_1 = require("./ControlBase");
class AlarmClock extends ControlBase_1.ControlBase {
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
                'isEnabled',
                'isAlarmActive',
                'confirmationNeeded',
                'ringingTime',
                'ringDuration',
                'prepareDuration',
                'snoozeTime',
                'snoozeDuration',
            ]);
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'isEnabled', 'switch', {
                write: true,
                smartIgnore: false,
            });
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'isAlarmActive', 'indicator');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'confirmationNeeded', 'indicator');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'ringingTime', 'number', 'value.interval');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'ringDuration', 'number', 'value.interval', { write: true });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'prepareDuration', 'number', 'value.interval', { write: true });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'snoozeTime', 'number', 'value.interval');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'snoozeDuration', 'number', 'value.interval', { write: true });
            this.addStateChangeListener(uuid + '.isEnabled', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'setActive/' + (newValue ? '0' : '1')); // yes, really, this is inverted!
            });
            this.addStateChangeListener(uuid + '.ringDuration', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'setRingDuration/' + newValue);
            });
            this.addStateChangeListener(uuid + '.prepareDuration', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'setPrepDuration/' + newValue);
            });
            this.addStateChangeListener(uuid + '.snoozeDuration', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'setSnoozeDuration/' + newValue);
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'snooze');
            this.addStateChangeListener(uuid + '.snooze', () => {
                this.sendCommand(control.uuidAction, 'snooze');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'dismiss');
            this.addStateChangeListener(uuid + '.dismiss', () => {
                this.sendCommand(control.uuidAction, 'dismiss');
            });
        });
    }
}
exports.AlarmClock = AlarmClock;
//# sourceMappingURL=AlarmClock.js.map