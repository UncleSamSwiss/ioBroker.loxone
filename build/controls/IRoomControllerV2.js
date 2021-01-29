"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRoomControllerV2 = void 0;
const control_base_1 = require("./control-base");
class IRoomControllerV2 extends control_base_1.ControlBase {
    constructor() {
        super(...arguments);
        this.uuid = '';
    }
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'thermo',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'comfortTemperature',
            'comfortTolerance',
            'absentMinOffset',
            'absentMaxOffset',
            'comfortTemperatureOffset',
        ]);
        await this.updateStateObjectAsync(uuid + '.comfortTemperature', {
            name: control.name + ': comfortTemperature',
            read: true,
            write: true,
            type: 'number',
            role: 'level.temperature',
        }, control.states.comfortTemperature, async (name, value) => {
            await this.setStateAck(name, value);
        });
        this.addStateChangeListener(uuid + '.comfortTemperature', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'setComfortTemperature/' + newValue);
        });
        await this.updateStateObjectAsync(uuid + '.comfortTolerance', {
            name: control.name + ': comfortTolerance',
            read: true,
            write: true,
            type: 'number',
            min: 0.5,
            max: 3.0,
            role: 'level.temperature',
        }, control.states.comfortTolerance, async (name, value) => {
            await this.setStateAck(name, value);
        });
        this.addStateChangeListener(uuid + '.comfortTolerance', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'setComfortTolerance/' + newValue);
        });
        await this.updateStateObjectAsync(uuid + '.absentMinOffset', {
            name: control.name + ': absentMinOffset',
            read: true,
            write: true,
            type: 'number',
            role: 'level.temperature',
        }, control.states.absentMinOffset, async (name, value) => {
            await this.setStateAck(name, value);
        });
        this.addStateChangeListener(uuid + '.absentMinOffset', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'setAbsentMinTemperature/' + newValue);
        });
        await this.updateStateObjectAsync(uuid + '.absentMaxOffset', {
            name: control.name + ': absentMaxOffset',
            read: true,
            write: true,
            type: 'number',
            role: 'level.temperature',
        }, control.states.absentMaxOffset, async (name, value) => {
            await this.setStateAck(name, value);
        });
        this.addStateChangeListener(uuid + '.absentMaxOffset', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'setAbsentMaxTemperature/' + newValue);
        });
        await this.updateStateObjectAsync(uuid + '.comfortTemperatureOffset', {
            name: control.name + ': comfortTemperatureOffset',
            read: true,
            write: true,
            type: 'number',
            role: 'level.temperature',
        }, control.states.comfortTemperatureOffset, async (name, value) => {
            await this.setStateAck(name, value);
        });
        this.addStateChangeListener(uuid + '.comfortTemperatureOffset', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'setComfortModeTemp/' + newValue);
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'stopOverride');
        this.addStateChangeListener(uuid + '.stopOverride', () => {
            this.sendCommand(control.uuidAction, 'stopOverride');
        });
        // TODO: Controls not yet implemented:
        // override
        // setManualTemperature
        // setOperatingMode
        // setComfortModeTemp
        // set
        // modeslist
        // TODO: Subcontrols not yet implemented:
        // IRCV2Daytimer
    }
}
exports.IRoomControllerV2 = IRoomControllerV2;
//# sourceMappingURL=IRoomControllerV2.js.map