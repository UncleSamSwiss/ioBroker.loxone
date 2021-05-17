"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AalSmartAlarm = void 0;
const control_base_1 = require("./control-base");
class AalSmartAlarm extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'alarm',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'alarmLevel',
            'alarmCause',
            'isLocked',
            'isLeaveActive',
            'disableEndTime',
        ]);
        const levelStates = {
            '0': 'None',
            '1': 'Immediate',
            '2': 'Delayed',
        };
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'alarmLevel', 'number', 'value', { states: levelStates });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'alarmCause', 'string', 'text');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'isLocked', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'isLeaveActive', 'indicator');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'disableEndTime', 'number', 'value.interval');
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'confirm');
        this.addStateChangeListener(uuid + '.confirm', () => {
            this.sendCommand(control.uuidAction, 'confirm');
        });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'disable', 'number', 'level.timer', {
            read: false,
            write: true,
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'startDrill');
        this.addStateChangeListener(uuid + '.startDrill', () => {
            this.sendCommand(control.uuidAction, 'startDrill');
        });
        await this.loadSubControlsAsync(uuid, control);
    }
}
exports.AalSmartAlarm = AalSmartAlarm;
//# sourceMappingURL=AalSmartAlarm.js.map