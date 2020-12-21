"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmClock = void 0;
const control_base_1 = require("./control-base");
class AlarmClock extends control_base_1.ControlBase {
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
            'isEnabled',
            'isAlarmActive',
            'confirmationNeeded',
            'ringingTime',
            'ringDuration',
            'prepareDuration',
            'snoozeTime',
            'snoozeDuration',
        ]);
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'isEnabled', 'switch', {
            write: true,
        });
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'isAlarmActive', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'confirmationNeeded', 'indicator');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'ringingTime', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'ringDuration', 'number', 'value.interval', { write: true });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'prepareDuration', 'number', 'value.interval', { write: true });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'snoozeTime', 'number', 'value.interval');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'snoozeDuration', 'number', 'value.interval', { write: true });
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
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'snooze');
        this.addStateChangeListener(uuid + '.snooze', () => {
            this.sendCommand(control.uuidAction, 'snooze');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'dismiss');
        this.addStateChangeListener(uuid + '.dismiss', () => {
            this.sendCommand(control.uuidAction, 'dismiss');
        });
    }
}
exports.AlarmClock = AlarmClock;
//# sourceMappingURL=AlarmClock.js.map