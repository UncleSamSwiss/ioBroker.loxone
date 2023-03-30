"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailBox = void 0;
const control_base_1 = require("./control-base");
class MailBox extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'info',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'notificationsDisabledInput',
            'packetReceived',
            'mailReceived',
            'disableEndTime',
        ]);
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'notificationsDisabledInput', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'packetReceived', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'mailReceived', 'indicator');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'disableEndTime', 'number', 'value.interval');
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'confirmPacket');
        this.addStateChangeListener(uuid + '.confirmPacket', () => {
            this.sendCommand(control.uuidAction, 'confirmPacket');
        }, { selfAck: true });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'confirmMail');
        this.addStateChangeListener(uuid + '.confirmMail', () => {
            this.sendCommand(control.uuidAction, 'confirmMail');
        }, { selfAck: true });
        await this.createNumberInputStateObjectAsync(control.name, uuid, 'disableNotifications', 'level.timer');
        this.addStateChangeListener(uuid + '.disableNotifications', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, `disableNotifications/${newValue || '0'}`);
        });
        await this.loadSubControlsAsync(uuid, control);
    }
}
exports.MailBox = MailBox;
//# sourceMappingURL=MailBox.js.map