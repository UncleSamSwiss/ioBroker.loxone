"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioZoneV2 = void 0;
const control_base_1 = require("./control-base");
class AudioZoneV2 extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'media.music',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'serverState',
            'playState',
            'clientState',
            'power',
            'volume',
            'volumeStep',
        ]);
        const serverStates = {
            '-3': 'invalid zone',
            '-2': 'not reachable',
            '-1': 'unknown',
            '0': 'offline',
            '1': 'initializing',
            '2': 'online',
        };
        const playStates = {
            '-1': 'unknown',
            '0': 'stopped',
            '1': 'paused',
            '2': 'playing',
        };
        const clientStates = {
            '0': 'offline',
            '1': 'initializing',
            '2': 'online',
        };
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'serverState', 'number', 'value', { states: serverStates });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'playState', 'number', 'value', { write: true, states: playStates });
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'clientState', 'number', 'value', { states: clientStates });
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'power', 'switch', {
            write: true,
            // TODO: re-add: smartIgnore: false,
        });
        await this.createNumberInputStateObjectAsync(control.name, uuid, 'volume', 'level.volume', { write: true });
        this.addStateChangeListener(uuid + '.playState', (oldValue, newValue) => {
            newValue = this.convertStateToInt(newValue);
            if (newValue === 0 || newValue === 1) {
                this.sendCommand(control.uuidAction, 'pause');
            }
            else if (newValue === 2) {
                this.sendCommand(control.uuidAction, 'play');
            }
        });
        this.addStateChangeListener(uuid + '.power', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, newValue ? 'on' : 'off');
        });
        this.addStateChangeListener(uuid + '.volume', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'volume/' + newValue);
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'prev');
        this.addStateChangeListener(uuid + '.prev', () => {
            this.sendCommand(control.uuidAction, 'prev');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'next');
        this.addStateChangeListener(uuid + '.next', () => {
            this.sendCommand(control.uuidAction, 'next');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'pause');
        this.addStateChangeListener(uuid + '.pause', () => {
            this.sendCommand(control.uuidAction, 'pause');
        });
    }
}
exports.AudioZoneV2 = AudioZoneV2;
//# sourceMappingURL=AudioZoneV2.js.map