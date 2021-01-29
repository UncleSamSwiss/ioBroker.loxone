import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class IRoomControllerV2 extends ControlBase {
    private uuid = '';

    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'thermo',
            },
            native: { control: control as any },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'comfortTemperature',
            'comfortTolerance',
            'absentMinOffset',
            'absentMaxOffset',
            'comfortTemperatureOffset',
        ]);

        await this.updateStateObjectAsync(
            uuid + '.comfortTemperature',
            {
                name: control.name + ': comfortTemperature',
                read: true,
                write: true,
                type: 'number',
                role: 'level.temperature',
            },
            control.states.comfortTemperature,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        this.addStateChangeListener(
            uuid + '.comfortTemperature',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setComfortTemperature/' + newValue);
            },
        );

        await this.updateStateObjectAsync(
            uuid + '.comfortTolerance',
            {
                name: control.name + ': comfortTolerance',
                read: true,
                write: true,
                type: 'number',
                min: 0.5,
                max: 3.0,
                role: 'level.temperature',
            },
            control.states.comfortTolerance,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        this.addStateChangeListener(
            uuid + '.comfortTolerance',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setComfortTolerance/' + newValue);
            },
        );

        await this.updateStateObjectAsync(
            uuid + '.absentMinOffset',
            {
                name: control.name + ': absentMinOffset',
                read: true,
                write: true,
                type: 'number',
                role: 'level.temperature',
            },
            control.states.absentMinOffset,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        this.addStateChangeListener(
            uuid + '.absentMinOffset',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setAbsentMinTemperature/' + newValue);
            },
        );

        await this.updateStateObjectAsync(
            uuid + '.absentMaxOffset',
            {
                name: control.name + ': absentMaxOffset',
                read: true,
                write: true,
                type: 'number',
                role: 'level.temperature',
            },
            control.states.absentMaxOffset,
            async (name: string, value: any) => {
                await this.setStateAck(name, value);
            },
        );
        this.addStateChangeListener(
            uuid + '.absentMaxOffset',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setAbsentMaxTemperature/' + newValue);
            },
        );

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
            },
        );
        this.addStateChangeListener(
            uuid + '.comfortTemperatureOffset',
            (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                this.sendCommand(control.uuidAction, 'setComfortModeTemp/' + newValue);
            },
        );

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
