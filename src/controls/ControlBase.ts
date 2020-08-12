import { sprintf } from 'sprintf-js';
import {
    CurrentStateValue,
    Loxone,
    NamedStateEventHandler,
    OldStateValue,
    StateChangeListener,
    StateEventHandler,
} from '../main';

export type ControlType = 'device' | 'channel';

export abstract class ControlBase {
    protected constructor(protected readonly adapter: Loxone) {}
    abstract loadAsync(type: ControlType, uuid: string, control: any): Promise<void>;

    protected async loadSubControlsAsync(parentUuid: string, control: any): Promise<void> {
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

    protected async updateObjectAsync(id: string, obj: ioBroker.PartialObject): Promise<void> {
        await this.adapter.updateObjectAsync(id, obj);
    }

    protected async updateStateObjectAsync(
        id: string,
        commonInfo: any,
        stateUuid: string,
        stateEventHandler?: NamedStateEventHandler,
    ): Promise<void> {
        await this.adapter.updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler);
    }

    protected async loadOtherControlStatesAsync(
        controlName: string,
        uuid: string,
        states: any,
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
        states: any,
        name: string,
        type: string,
        role: string,
        commonExt?: any,
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
                common = { common, ...commonExt };
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
        states: any,
        name: string,
        role: string,
        commonExt?: any,
    ): Promise<void> {
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: 'boolean',
                role: role,
                smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { common, ...commonExt };
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
        states: any,
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
                    smartIgnore: true,
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
        states: any,
        name: string,
        role: string,
        commonExt?: any,
    ): Promise<void> {
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: 'number',
                role: role,
                unit: '%',
                smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { common, ...commonExt };
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
        commonExt?: any,
    ): Promise<void> {
        let common = {
            name: controlName + ': ' + name,
            read: false,
            write: true,
            type: 'boolean',
            role: 'button',
            smartIgnore: true,
        };
        if (commonExt && typeof commonExt === 'object') {
            common = { common, ...commonExt };
        }
        await this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, uuid);
    }

    protected normalizeName(name: string): string {
        return name.trim().replace(/[^\wäöüÄÖÜäöüéàèêçß]+/g, '_');
    }
}
