import { Loxone, NamedStateEventHandler, StateChangeListener, StateEventHandler, StateValue } from '../main';

export abstract class ControlBase {
    protected constructor(protected readonly adapter: Loxone) {}
    abstract loadAsync(type: string, uuid: string, control: any): Promise<void>;

    protected addStateChangeListener(id: string, listener: StateChangeListener): void {
        this.adapter.addStateChangeListener(id, listener);
    }

    protected addStateEventHandler(uuid: string, eventHandler: StateEventHandler, name?: string): void {
        this.adapter.addStateEventHandler(uuid, eventHandler, name);
    }

    protected sendCommand(uuid: string, action: string): void {
        this.adapter.sendCommand(uuid, action);
    }

    protected setStateAck(id: string, value: StateValue | null): void {
        this.adapter.setStateAck(id, value);
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
                (name: string, value: StateValue | null) => {
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
                (name: string, value: StateValue | null) => {
                    this.setStateAck(name, !value ? [] : value.toString().split('|'));
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
