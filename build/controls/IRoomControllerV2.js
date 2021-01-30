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
        this.uuid = uuid;
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'thermo',
            },
            native: { control: control },
        });
        // TODO: details not implemented
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'absentMinOffset',
            'absentMaxOffset',
            'activeMode',
            'comfortTemperature',
            'comfortTemperatureOffset',
            'comfortTolerance',
            'operatingMode',
            'tempTarget',
        ]);
        // Add event handler to frost/heat protection values so we re-calc target min/max if they change
        this.addStateEventHandler(uuid + '.frostProtectTemperature', async () => {
            await this.updateTempTargetMinMax();
        });
        this.addStateEventHandler(uuid + '.heatProtectTemperature', async () => {
            await this.updateTempTargetMinMax();
        });
        await this.updateStateObjectAsync(uuid + '.activeMode', {
            name: control.name + ': activeMode',
            read: true,
            write: true,
            type: 'number',
            role: 'level',
            states: {
                0: 'Economy',
                1: 'Comfort',
                2: 'Fabric Protection',
                3: 'Manual',
            },
        }, control.states.activeMode, async (name, value) => {
            await this.setStateAck(name, value);
            await this.updateTempTargetMinMax();
        });
        this.addStateChangeListener(uuid + '.activeMode', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'override/' + newValue);
        });
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
            await this.updateTempTargetMinMax();
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
            await this.updateTempTargetMinMax();
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
            await this.updateTempTargetMinMax();
        });
        this.addStateChangeListener(uuid + '.comfortTemperatureOffset', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'setComfortModeTemp/' + newValue);
        });
        await this.updateStateObjectAsync(uuid + '.tempTarget', {
            name: control.name + ': tempTarget',
            read: true,
            write: true,
            type: 'number',
            role: 'level.temperature',
        }, control.states.tempTarget, async (name, value) => {
            await this.setStateAck(name, value);
            await this.updateTempTargetMinMax();
        });
        this.addStateChangeListener(uuid + '.tempTarget', (oldValue, newValue) => {
            // Target has been set manually so start an override at that value
            // setManualTemperature is redundant in this context as simply setting that value
            // does not actually tell IRC to switch to manual mode.
            // We could force whatever updates the tempTarget to then need to change mode to manual
            // but that would be illogical as the target now shown would not actually be the target
            // being worked with.
            // So because of this, just start an override at the given temperature.
            this.sendCommand(control.uuidAction, 'override/3//' + newValue);
        });
        await this.updateStateObjectAsync(uuid + '.operatingMode', {
            name: control.name + ': operatingMode',
            read: true,
            write: true,
            type: 'number',
            role: 'level',
            states: {
                0: 'Automatic heating/cooling',
                1: 'Automatic heating',
                2: 'Automatic cooling',
                3: 'Manual heating/cooling',
                4: 'Manual heating',
                5: 'Manual cooling',
            },
        }, control.states.operatingMode, async (name, value) => {
            await this.setStateAck(name, value);
        });
        this.addStateChangeListener(uuid + '.operatingMode', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'override/' + newValue);
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'stopOverride');
        this.addStateChangeListener(uuid + '.stopOverride', () => {
            this.sendCommand(control.uuidAction, 'stopOverride');
        });
        // When in Eco/Building Protection modes Loxone app/web shows target as min..max range
        // Handy so create derived state for each
        await this.updateObjectAsync(uuid + '.tempTargetMin', {
            type: 'state',
            common: {
                name: control.name + ': tempTargetMin',
                type: 'number',
                role: 'value.temperature',
                read: true,
                write: false,
            },
            native: {},
        });
        await this.updateObjectAsync(uuid + '.tempTargetMax', {
            type: 'state',
            common: {
                name: control.name + ': tempTargetMax',
                type: 'number',
                role: 'value.temperature',
                read: true,
                write: false,
            },
            native: {},
        });
        // TODO: Controls not yet implemented:
        // override (at least not fully)
        // setComfortModeTemp (redundant as setComfortTemperature implemented - I think!)
        // set
        // modeslist
        // TODO: Subcontrols not yet implemented:
        // IRCV2Daytimer
    }
    // Calculate and update tempTargetMin/Max
    // Should be triggered when any inputs change
    // TODO: this is called when any of the input variables change in handlers above.
    // Would be slightly more efficient (& complex) to only call this update if the
    // inputs relating to current mode change. Ie. dont call this on absentMinOffset
    // change if mode is 1.
    async updateTempTargetMinMax() {
        const activeMode = this.convertStateToInt(this.getCachedStateValue(this.uuid + '.activeMode'));
        let tempTargetMin;
        let tempTargetMax;
        switch (activeMode) {
            case 0:
                // Economy, min/max are target +/- absent offset
                const absentMinOffset = this.convertStateToFloat(this.getCachedStateValue(this.uuid + '.absentMinOffset'));
                const absentMaxOffset = this.convertStateToFloat(this.getCachedStateValue(this.uuid + '.absentMaxOffset'));
                const comfortTemperature = this.convertStateToFloat(this.getCachedStateValue(this.uuid + '.comfortTemperature'));
                tempTargetMin = comfortTemperature - absentMinOffset;
                tempTargetMax = comfortTemperature + absentMaxOffset;
                this.adapter.log.debug(`Mode ${activeMode}: ${absentMinOffset}/${absentMaxOffset}/${comfortTemperature} -> ${tempTargetMin}/${tempTargetMax}`);
                break;
            case 1:
            case 3:
                // Comfort & manual mode just use direct target
                tempTargetMin = tempTargetMax = this.convertStateToFloat(this.getCachedStateValue(this.uuid + '.tempTarget'));
                this.adapter.log.debug(`Mode ${activeMode}: ${tempTargetMin} -> ${tempTargetMin}/${tempTargetMax}`);
                break;
            case 2:
                // Building protection uses frost & heat protection
                tempTargetMin = this.convertStateToFloat(this.getCachedStateValue(this.uuid + '.frostProtectTemperature'));
                tempTargetMax = this.convertStateToFloat(this.getCachedStateValue(this.uuid + '.heatProtectTemperature'));
                this.adapter.log.debug(`Mode ${activeMode}: -> ${tempTargetMin}/${tempTargetMax}`);
                break;
            default:
                this.adapter.log.error(`Unknown IRoomControllerV2 activeMode: ${activeMode}`);
                break;
        }
        // Don't do any update if not calculated (can only happen in error condition)
        if (tempTargetMin != null) {
            await this.setStateAck(this.uuid + '.tempTargetMin', tempTargetMin);
        }
        if (tempTargetMax != null) {
            await this.setStateAck(this.uuid + '.tempTargetMax', tempTargetMax);
        }
    }
}
exports.IRoomControllerV2 = IRoomControllerV2;
//# sourceMappingURL=IRoomControllerV2.js.map