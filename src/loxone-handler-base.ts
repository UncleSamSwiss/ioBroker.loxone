import { sprintf } from 'sprintf-js';
import {
    CurrentStateValue,
    Loxone,
    NamedStateEventHandler,
    OldStateValue,
    StateChangeListener,
    StateEventHandler,
} from './main';
import { Control, ControlStates } from './structure-file';

export abstract class LoxoneHandlerBase {
    protected constructor(protected readonly adapter: Loxone) {}

    protected async loadSubControlsAsync(parentUuid: string, control: Control): Promise<void> {
        return await this.adapter.loadSubControlsAsync(parentUuid, control);
    }

    protected addStateChangeListener(id: string, listener: StateChangeListener): void {
        this.adapter.addStateChangeListener(id, listener);
    }

    protected addStateEventHandler(uuid: string, eventHandler: StateEventHandler, name?: string): void {
        this.adapter.addStateEventHandler(uuid, eventHandler, name);
    }

    protected removeStateEventHandler(uuid: string, name: string): boolean {
        return this.adapter.removeStateEventHandler(uuid, name);
    }

    protected sendCommand(uuid: string, action: string): void {
        this.adapter.sendCommand(uuid, action);
    }

    protected setStateAck(id: string, value: CurrentStateValue): void {
        this.adapter.setStateAck(id, value);
    }

    protected setFormattedStateAck(id: string, value: CurrentStateValue, format: string): void {
        value = sprintf(format, value);
        this.setStateAck(id, value);
    }

    protected convertStateToInt(value: OldStateValue): number {
        return !value ? 0 : parseInt(value.toString());
    }

    protected getCachedStateValue(id: string): OldStateValue {
        return this.adapter.getCachedStateValue(id);
    }

    protected async updateObjectAsync(id: string, obj: ioBroker.SettableObject): Promise<void> {
        await this.adapter.updateObjectAsync(id, obj);
    }

    protected async updateStateObjectAsync(
        id: string,
        commonInfo: ioBroker.StateCommon,
        stateUuid: string,
        stateEventHandler?: NamedStateEventHandler,
    ): Promise<void> {
        await this.adapter.updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler);
    }

    protected async loadOtherControlStatesAsync(
        controlName: string,
        uuid: string,
        states: ControlStates,
        skipKeys: string[],
    ): Promise<void> {
        if (states === undefined) {
            return;
        }

        for (const stateName in states) {
            if (skipKeys.indexOf(stateName) !== -1) {
                continue;
            }

            await this.createSimpleControlStateObjectAsync(controlName, uuid, states, stateName, 'string', 'text');
        }
    }

    protected async createSimpleControlStateObjectAsync(
        controlName: string,
        uuid: string,
        states: ControlStates,
        name: string,
        type: ioBroker.CommonType,
        role: string,
        commonExt?: Partial<ioBroker.StateCommon>,
    ): Promise<void> {
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: type,
                role: role,
                smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(
                uuid + '.' + this.normalizeName(name),
                common,
                states[name],
                this.setStateAck.bind(this),
            );
        }
    }

    protected async createBooleanControlStateObjectAsync(
        controlName: string,
        uuid: string,
        states: ControlStates,
        name: string,
        role: string,
        commonExt?: Partial<ioBroker.StateCommon>,
    ): Promise<void> {
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: 'boolean' as ioBroker.CommonType,
                role: role,
                smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(
                uuid + '.' + this.normalizeName(name),
                common,
                states[name],
                (name: string, value: CurrentStateValue) => {
                    this.setStateAck(name, value == 1);
                },
            );
        }
    }

    protected async createListControlStateObjectAsync(
        controlName: string,
        uuid: string,
        states: ControlStates,
        name: string,
    ): Promise<void> {
        if (states !== undefined && states.hasOwnProperty(name)) {
            await this.updateStateObjectAsync(
                uuid + '.' + this.normalizeName(name),
                {
                    name: controlName + ': ' + name,
                    read: true,
                    write: false,
                    type: 'array',
                    role: 'list',
                    // TODO: re-add: smartIgnore: true,
                },
                states[name],
                (name: string, value: CurrentStateValue) => {
                    this.setStateAck(name, !value ? [] : value.toString().split('|'));
                },
            );
        }
    }

    protected async createPercentageControlStateObjectAsync(
        controlName: string,
        uuid: string,
        states: ControlStates,
        name: string,
        role: string,
        commonExt?: Partial<ioBroker.StateCommon>,
    ): Promise<void> {
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: 'number' as ioBroker.CommonType,
                role: role,
                unit: '%',
                smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(
                uuid + '.' + this.normalizeName(name),
                common,
                states[name],
                (name: string, value: CurrentStateValue) => {
                    this.setStateAck(name, Math.round(this.convertStateToInt(value)));
                },
            );
        }
    }

    protected async createButtonCommandStateObjectAsync(
        controlName: string,
        uuid: string,
        name: string,
        commonExt?: Partial<ioBroker.StateCommon>,
    ): Promise<void> {
        let common = {
            name: controlName + ': ' + name,
            read: false,
            write: true,
            type: 'boolean' as ioBroker.CommonType,
            role: 'button',
            smartIgnore: true,
        };
        if (commonExt && typeof commonExt === 'object') {
            common = { ...common, ...commonExt };
        }
        await this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, uuid);
    }

    protected async createTextInputStateObjectAsync(
        controlName: string,
        uuid: string,
        states: ControlStates,
        name: string,
        type: ioBroker.CommonType,
        role: string,
        commonExt?: Partial<ioBroker.StateCommon>,
    ): Promise<void> {
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
                read: false,
                write: true,
                type: type,
                role: role,
                //smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(
                uuid + '.' + this.normalizeName(name),
                common,
                states[name],
                this.setStateAck.bind(this),
            );
        }
    }

    protected normalizeName(name: string): string {
        return name.trim().replace(/[^\wäöüÄÖÜäöüéàèêçß]+/g, '_');
    }
}
