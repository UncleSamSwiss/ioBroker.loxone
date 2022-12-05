import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';
export class IRoomControllerV2 extends ControlBase {
    private uuid = '';

    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        this.uuid = uuid;

        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'thermo',
            },
            native: { control },
        });

        // TODO: other details not implemented - needed to get temperature unit for example (C/F).
        // TODO: connectedInputs has bits for frost/heat protection but no set control for them. Eh?
        const comfortTemperatureWrite = (<number>control.details.connectedInputs) & 1 ? false : true;
        const comfortTemperatureCoolWrite = (<number>control.details.connectedInputs) & 2 ? false : true;

        // comfortToleranceWrite marked as deprecated in Loxone doco
        const comfortToleranceWrite = (<number>control.details.connectedInputs) & 4 ? false : true;

        const absentMinOffsetWrite = (<number>control.details.connectedInputs) & 8 ? false : true;
        const absentMaxOffsetWrite = (<number>control.details.connectedInputs) & 16 ? false : true;

        const shadingHeatTempWrite = (<number>control.details.connectedInputs) & 32 ? false : true;
        const shadingCoolTempWrite = (<number>control.details.connectedInputs) & 64 ? false : true;

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'jLocked', 'string', 'json');
        await this.createListControlStateObjectAsync(control.name, uuid, control.states, 'modeList');
        await this.createListControlStateObjectAsync(control.name, uuid, control.states, 'overrideEntries');
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'overrideReason',
            'number',
            'value',
            {
                states: {
                    0: 'None',
                    1: 'Presence -> Comfort',
                    2: 'Window open -> Eco+',
                    3: 'Comfort',
                    4: 'Eco',
                    5: 'Eco+',
                    6: 'Heat Up',
                    7: 'Cool Down',
                },
            },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'prepareState',
            'number',
            'value',
            {
                states: {
                    '-1': 'Cooling Down',
                    0: 'None',
                    1: 'Heating Up',
                },
            },
        );
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'openWindow', 'indicator');
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'useOutdoor', 'indicator');

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'frostProtectTemperature',
            'number',
            'value.temperature',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'heatProtectTemperature',
            'number',
            'value.temperature',
        );
        // Add event handler to frost/heat protection values so we re-calc target min/max if they change
        this.addStateEventHandler(uuid + '.frostProtectTemperature', async () => {
            await this.updateTempTargetMinMax();
        });
        this.addStateEventHandler(uuid + '.heatProtectTemperature', async () => {
            await this.updateTempTargetMinMax();
        });

        await this.updateStateObjectAsync(
            uuid + '.activeMode',
            {
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
            },
            control.states.activeMode,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
                await this.updateTempTargetMinMax();
            },
        );
        this.addStateChangeListener(uuid + '.activeMode', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'override/' + newValue);
        });

        await this.updateStateObjectAsync(
            uuid + '.comfortTemperature',
            {
                name: control.name + ': comfortTemperature',
                read: true,
                write: comfortTemperatureWrite,
                type: 'number',
                role: comfortTemperatureWrite ? 'level.temperature' : 'value.temperature',
            },
            control.states.comfortTemperature,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        if (comfortTemperatureWrite) {
            this.addStateChangeListener(
                uuid + '.comfortTemperature',
                (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                    this.sendCommand(control.uuidAction, 'setComfortTemperature/' + newValue);
                },
            );
        }

        await this.updateStateObjectAsync(
            uuid + '.comfortTemperatureCool',
            {
                name: control.name + ': comfortTemperatureCool',
                read: true,
                write: comfortTemperatureCoolWrite,
                type: 'number',
                role: comfortTemperatureCoolWrite ? 'level.temperature' : 'value.temperature',
            },
            control.states.comfortTemperatureCool,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        if (comfortTemperatureCoolWrite) {
            this.addStateChangeListener(
                uuid + '.comfortTemperatureCool',
                (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                    this.sendCommand(control.uuidAction, 'setComfortTemperatureCool/' + newValue);
                },
            );
        }

        await this.updateStateObjectAsync(
            uuid + '.comfortTolerance',
            {
                name: control.name + ': comfortTolerance',
                read: true,
                write: comfortToleranceWrite,
                type: 'number',
                min: 0.5,
                max: 3.0,
                role: comfortToleranceWrite ? 'level.temperature' : 'value.temperature',
            },
            control.states.comfortTolerance,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        if (comfortToleranceWrite) {
            this.addStateChangeListener(
                uuid + '.comfortTolerance',
                (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                    this.sendCommand(control.uuidAction, 'setComfortTolerance/' + newValue);
                },
            );
        }

        await this.updateStateObjectAsync(
            uuid + '.absentMinOffset',
            {
                name: control.name + ': absentMinOffset',
                read: true,
                write: absentMinOffsetWrite,
                type: 'number',
                role: absentMinOffsetWrite ? 'level.temperature' : 'value.temperature',
            },
            control.states.absentMinOffset,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
                await this.updateTempTargetMinMax();
            },
        );
        if (absentMinOffsetWrite) {
            this.addStateChangeListener(
                uuid + '.absentMinOffset',
                (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                    this.sendCommand(control.uuidAction, 'setAbsentMinTemperature/' + newValue);
                },
            );
        }

        await this.updateStateObjectAsync(
            uuid + '.absentMaxOffset',
            {
                name: control.name + ': absentMaxOffset',
                read: true,
                write: absentMaxOffsetWrite,
                type: 'number',
                role: absentMaxOffsetWrite ? 'level.temperature' : 'value.temperature',
            },
            control.states.absentMaxOffset,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
                await this.updateTempTargetMinMax();
            },
        );
        if (absentMaxOffsetWrite) {
            this.addStateChangeListener(
                uuid + '.absentMaxOffset',
                (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                    this.sendCommand(control.uuidAction, 'setAbsentMaxTemperature/' + newValue);
                },
            );
        }

        await this.updateStateObjectAsync(
            uuid + '.comfortTemperatureOffset',
            {
                name: control.name + ': comfortTemperatureOffset',
                read: true,
                write: true,
                type: 'number',
                role: 'level.temperature',
            },
            control.states.comfortTemperatureOffset,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
                await this.updateTempTargetMinMax();
            },
        );
        this.addStateChangeListener(
            uuid + '.comfortTemperatureOffset',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setComfortModeTemp/' + newValue);
            },
        );

        await this.updateStateObjectAsync(
            uuid + '.shadingHeatTemp',
            {
                name: control.name + ': shadingHeatTemp',
                read: true,
                write: shadingHeatTempWrite,
                type: 'number',
                role: shadingHeatTempWrite ? 'level.temperature' : 'value.temperature',
            },
            control.states.shadingHeatTemp,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        if (shadingHeatTempWrite) {
            this.addStateChangeListener(
                uuid + '.shadingHeatTemp',
                (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                    this.sendCommand(control.uuidAction, 'setShadingHeatTemp/' + newValue);
                },
            );
        }

        await this.updateStateObjectAsync(
            uuid + '.shadingCoolTemp',
            {
                name: control.name + ': shadingCoolTemp',
                read: true,
                write: shadingCoolTempWrite,
                type: 'number',
                role: shadingCoolTempWrite ? 'level.temperature' : 'value.temperature',
            },
            control.states.shadingCoolTemp,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        if (shadingHeatTempWrite) {
            this.addStateChangeListener(
                uuid + '.shadingCoolTemp',
                (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                    this.sendCommand(control.uuidAction, 'setShadingCoolTemp/' + newValue);
                },
            );
        }

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'shadingOut',
            'boolean',
            'indicator',
        );

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'tempActual',
            'number',
            'value.temperature',
        );

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'actualOutdoorTemp',
            'number',
            'value.temperature',
        );

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'averageOutdoorTemp',
            'number',
            'value.temperature',
        );

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'excessEnergyTempOffset',
            'number',
            'value.temperature',
        );

        await this.updateStateObjectAsync(
            uuid + '.temperatureBoundaryInfo',
            {
                name: control.name + ': temperatureBoundaryInfo',
                read: true,
                write: false,
                type: 'number',
                role: 'level',
                states: {
                    0: 'Not enough data',
                    1: 'OK',
                    2: 'No data at all',
                },
            },
            control.states.temperatureBoundaryInfo,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );

        await this.updateStateObjectAsync(
            uuid + '.tempTarget',
            {
                name: control.name + ': tempTarget',
                read: true,
                write: true,
                type: 'number',
                role: 'level.temperature',
            },
            control.states.tempTarget,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
                await this.updateTempTargetMinMax();
            },
        );
        this.addStateChangeListener(uuid + '.tempTarget', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            // Target has been set manually so start an override at that value
            // setManualTemperature is redundant in this context as simply setting that value
            // does not actually tell IRC to switch to manual mode.
            // We could force whatever updates the tempTarget to then need to change mode to manual
            // but that would be illogical as the target now shown would not actually be the target
            // being worked with.
            // So because of this, just start an override at the given temperature.
            this.sendCommand(control.uuidAction, 'override/3//' + newValue);
        });

        // TODO: capabilities is a bitmask, possibility to decode it's meaning?
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'capabilities',
            'number',
            'value',
        );

        await this.updateStateObjectAsync(
            uuid + '.currentMode',
            {
                name: control.name + ': currentMode',
                read: true,
                write: false,
                type: 'number',
                role: 'level',
                states: {
                    0: 'No requirement',
                    1: 'Heating',
                    2: 'Cooling',
                    3: 'Heating boost',
                    4: 'Cooling boost',
                    5: 'Service mode',
                    6: 'External Heater',
                },
            },
            control.states.currentMode,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );

        await this.updateStateObjectAsync(
            uuid + '.autoMode',
            {
                name: control.name + ': autoMode',
                read: true,
                write: false,
                type: 'number',
                role: 'level',
                states: {
                    0: 'Heating and cooling',
                    1: 'Heating',
                    2: 'Cooling',
                },
            },
            control.states.autoMode,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );

        await this.updateStateObjectAsync(
            uuid + '.operatingMode',
            {
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
            },
            control.states.operatingMode,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        this.addStateChangeListener(uuid + '.operatingMode', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'setOperatingMode/' + newValue);
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
        // When done: await this.loadSubControlsAsync(uuid, control);
    }

    // Calculate and update tempTargetMin/Max
    // Should be triggered when any inputs change
    // TODO: this is called when any of the input variables change in handlers above.
    // Would be slightly more efficient (& complex) to only call this update if the
    // inputs relating to current mode change. Ie. dont call this on absentMinOffset
    // change if mode is 1.
    protected async updateTempTargetMinMax(): Promise<void> {
        const activeMode = this.convertStateToInt(this.getCachedStateValue(this.uuid + '.activeMode'));
        let tempTargetMin;
        let tempTargetMax;
        switch (activeMode) {
            case 0:
                // Economy, min/max are target +/- absent offset
                const absentMinOffset = this.convertStateToFloat(
                    this.getCachedStateValue(this.uuid + '.absentMinOffset'),
                );
                const absentMaxOffset = this.convertStateToFloat(
                    this.getCachedStateValue(this.uuid + '.absentMaxOffset'),
                );
                const comfortTemperature = this.convertStateToFloat(
                    this.getCachedStateValue(this.uuid + '.comfortTemperature'),
                );

                tempTargetMin = comfortTemperature - absentMinOffset;
                tempTargetMax = comfortTemperature + absentMaxOffset;
                this.adapter.log.debug(
                    `Mode ${activeMode}: ${absentMinOffset}/${absentMaxOffset}/${comfortTemperature} -> ${tempTargetMin}/${tempTargetMax}`,
                );
                break;

            case 1:
            case 3:
                // Comfort & manual mode just use direct target
                tempTargetMin = tempTargetMax = this.convertStateToFloat(
                    this.getCachedStateValue(this.uuid + '.tempTarget'),
                );
                this.adapter.log.debug(`Mode ${activeMode}: ${tempTargetMin} -> ${tempTargetMin}/${tempTargetMax}`);
                break;

            case 2:
                // Building protection uses frost & heat protection
                tempTargetMin = this.convertStateToFloat(
                    this.getCachedStateValue(this.uuid + '.frostProtectTemperature'),
                );
                tempTargetMax = this.convertStateToFloat(
                    this.getCachedStateValue(this.uuid + '.heatProtectTemperature'),
                );
                this.adapter.log.debug(`Mode ${activeMode}: -> ${tempTargetMin}/${tempTargetMax}`);
                break;

            default:
                this.adapter.reportError(`Unknown IRoomControllerV2 activeMode: ${activeMode}`);
                break;
        }

        // Don't do any update if not calculated (can only happen in error condition)
        if (tempTargetMin !== undefined) {
            await this.setStateAck(this.uuid + '.tempTargetMin', tempTargetMin);
        }
        if (tempTargetMax !== undefined) {
            await this.setStateAck(this.uuid + '.tempTargetMax', tempTargetMax);
        }
    }
}
