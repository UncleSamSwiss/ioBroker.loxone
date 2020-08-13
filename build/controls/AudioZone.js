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
exports.AudioZone = void 0;
const control_base_1 = require("./control-base");
class AudioZone extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'media.music',
                },
                native: control,
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
                'serverState',
                'playState',
                'clientState',
                'power',
                'volume',
                'maxVolume',
                'volumeStep',
                'shuffle',
                'sourceList',
                'repeat',
                'songName',
                'duration',
                'progress',
                'album',
                'artist',
                'station',
                'genre',
                'cover',
                'source',
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
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'serverState', 'number', 'value', { states: serverStates });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'playState', 'number', 'value', { write: true, states: playStates });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'clientState', 'number', 'value', { states: clientStates });
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'power', 'switch', {
                write: true,
            });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'volume', 'number', 'level.volume', { write: true });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'maxVolume', 'number', 'value');
            yield this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'shuffle', 'switch', {
                write: true,
            });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'sourceList', 'string', 'json');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'repeat', 'number', 'value', { write: true });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'songName', 'string', 'text');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'duration', 'number', 'value.interval');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'progress', 'number', 'value.interval', { write: true });
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'album', 'string', 'text');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'artist', 'string', 'text');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'station', 'string', 'text');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'genre', 'string', 'text');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'cover', 'string', 'text.url');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'source', 'number', 'value', { write: true });
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
            this.addStateChangeListener(uuid + '.shuffle', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'shuffle/' + (newValue ? 1 : 0));
            });
            this.addStateChangeListener(uuid + '.repeat', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'repeat/' + newValue);
            });
            this.addStateChangeListener(uuid + '.progress', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'progress/' + newValue);
            });
            this.addStateChangeListener(uuid + '.source', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, 'source/' + newValue);
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'prev');
            this.addStateChangeListener(uuid + '.prev', () => {
                this.sendCommand(control.uuidAction, 'prev');
            });
            yield this.createButtonCommandStateObjectAsync(control.name, uuid, 'next');
            this.addStateChangeListener(uuid + '.next', () => {
                this.sendCommand(control.uuidAction, 'next');
            });
        });
    }
}
exports.AudioZone = AudioZone;
//# sourceMappingURL=AudioZone.js.map