/*
 * Created with @iobroker/create-adapter v1.26.0
 */

import * as utils from '@iobroker/adapter-core';
import * as loxoneWsApi from 'node-lox-ws-api';
//import * as colorConvert from 'color-convert';
import { ControlBase } from './controls/ControlBase';

// Augment the adapter.config object with the actual types
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ioBroker {
        interface AdapterConfig {
            host: string;
            port: number;
            username: string;
            password: string;
            syncNames: boolean;
            syncRooms: boolean;
            syncFunctions: boolean;
        }
    }
}

export type FlatStateValue = string | number | boolean;
export type StateValue = FlatStateValue | any[] | Record<string, any>;

export type StateChangeListener = (oldValue: StateValue | null | undefined, newValue: StateValue | null) => void;
export type StateEventHandler = (/*id: string, TODO: chekc if OK*/ value: any) => void;
export type StateEventRegistration = { name?: string; handler: StateEventHandler };
export type NamedStateEventHandler = (id: string, value: any) => void;

export class Loxone extends utils.Adapter {
    private client?: any;
    private existingObjects: Record<string, ioBroker.Object> = {};
    private currentStateValues: Record<string, StateValue | null> = {};
    private operatingModes: any = {};
    private foundRooms: Record<string, string[]> = {};
    private foundCats: Record<string, string[]> = {};

    private stateChangeListeners: Record<string, StateChangeListener> = {};
    private stateEventHandlers: Record<string, StateEventRegistration[]> = {};

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            dirname: __dirname.indexOf('node_modules') !== -1 ? undefined : __dirname + '/../',
            ...options,
            name: 'loxone',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {
        // store all current (acknowledged) state values
        const allStates = await this.getStatesAsync('*');
        for (const id in allStates) {
            if (allStates[id] && allStates[id].ack) {
                this.currentStateValues[id] = allStates[id].val;
            }
        }

        // store all existing objects for later use
        this.existingObjects = await this.getAdapterObjectsAsync();

        // Reset the connection indicator during startup
        this.setState('info.connection', false, true);

        // connect to Loxone Miniserver
        this.client = new loxoneWsApi(
            this.config.host + ':' + this.config.port,
            this.config.username,
            this.config.password,
            true,
            'AES-256-CBC',
        );
        this.client.connect();

        this.client.on('connect', () => {
            this.log.info('Miniserver connected');
        });

        this.client.on('authorized', () => {
            this.log.debug('authorized');

            // set the connection indicator
            this.setState('info.connection', true, true);
        });

        this.client.on('auth_failed', () => {
            this.log.error('Miniserver connect failed');
        });

        this.client.on('connect_failed', () => {
            this.log.error('Miniserver connect failed');
        });

        this.client.on('connection_error', (error: any) => {
            this.log.error('Miniserver connection error: ' + error);
        });

        this.client.on('close', () => {
            this.log.info('connection closed');
            this.setState('info.connection', false, true);
        });

        this.client.on('send', (message: any) => {
            this.log.debug('sent message: ' + message);
        });

        this.client.on('message_text', (message: any) => {
            this.log.debug('message_text ' + JSON.stringify(message));
        });

        this.client.on('message_file', (message: any) => {
            this.log.debug('message_file ' + JSON.stringify(message));
        });

        this.client.on('message_invalid', (message: any) => {
            this.log.debug('message_invalid ' + JSON.stringify(message));
        });

        this.client.on('keepalive', (time: number) => {
            this.log.silly('keepalive (' + time + 'ms)');
        });

        this.client.on('get_structure_file', async (data: any) => {
            this.log.silly('get_structure_file ' + JSON.stringify(data));
            this.log.info('got structure file; last modified on ' + data.lastModified);
            await this.loadStructureFileAsync(data);
        });

        const handleAnyEvent = (uuid: string, evt: any): void => {
            this.log.silly('received update event: ' + JSON.stringify(evt) + ':' + uuid);
            this.handleEvent(uuid, evt);
        };

        this.client.on('update_event_value', handleAnyEvent);
        this.client.on('update_event_text', handleAnyEvent);
        this.client.on('update_event_daytimer', handleAnyEvent);
        this.client.on('update_event_weather', handleAnyEvent);

        this.subscribeStates('*');
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        // Warning: state can be null if it was deleted!
        if (!id || !state || state.ack) {
            return;
        }

        this.log.silly('stateChange ' + id + ' ' + JSON.stringify(state));
        if (!this.stateChangeListeners.hasOwnProperty(id)) {
            this.log.error('Unsupported state change: ' + id);
            return;
        }

        this.stateChangeListeners[id](this.currentStateValues[id], state.val);
    }

    private async loadStructureFileAsync(data: any): Promise<void> {
        this.stateEventHandlers = {};
        this.foundRooms = {};
        this.foundCats = {};
        this.operatingModes = data.operatingModes;
        await this.loadGlobalStatesAsync(data.globalStates);
        await this.loadControlsAsync(data.controls);
        // TODO: implement:
        /*this.loadEnums(data.rooms, 'enum.rooms', this.config.syncRooms);
        this.loadEnums(data.cats, 'enum.functions', this.config.syncFunctions);
        this.loadWeatherServer(data.weatherServer);*/
    }

    private async loadGlobalStatesAsync(globalStates: Record<string, any>): Promise<void> {
        interface GlobalStateInfo {
            type: ioBroker.CommonType;
            role: string;
            handler: (name: string, value: FlatStateValue) => void;
        }
        const globalStateInfos: Record<string, GlobalStateInfo> = {
            operatingMode: {
                type: 'number',
                role: 'value',
                handler: this.setOperatingMode.bind(this),
            },
            sunrise: {
                type: 'number',
                role: 'value.interval',
                handler: this.setStateAck.bind(this),
            },
            sunset: {
                type: 'number',
                role: 'value.interval',
                handler: this.setStateAck.bind(this),
            },
            notifications: {
                type: 'number',
                role: 'value',
                handler: this.setStateAck.bind(this),
            },
            modifications: {
                type: 'number',
                role: 'value',
                handler: this.setStateAck.bind(this),
            },
        };
        const defaultInfo: GlobalStateInfo = {
            type: 'string',
            role: 'text',
            handler: this.setStateAck.bind(this),
        };

        // special case for operating mode (text)
        await this.updateObjectAsync('operatingMode-text', {
            type: 'state',
            common: {
                name: 'operatingMode: text',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
            },
            native: {
                uuid: globalStates.operatingMode,
            },
        });

        for (const globalStateName in globalStates) {
            const info = globalStateInfos.hasOwnProperty(globalStateName)
                ? globalStateInfos[globalStateName]
                : defaultInfo;
            await this.updateStateObjectAsync(
                globalStateName,
                {
                    name: globalStateName,
                    read: true,
                    write: false,
                    type: info.type,
                    role: info.role,
                },
                globalStates[globalStateName],
                info.handler,
            );
        }
    }

    private setOperatingMode(name: string, value: any): void {
        this.setStateAck(name, value);
        this.setStateAck(name + '-text', this.operatingModes[value]);
    }

    private async loadControlsAsync(controls: any): Promise<void> {
        let hasUnsupported = false;
        for (const uuid in controls) {
            const control = controls[uuid];
            if (!control.hasOwnProperty('type')) {
                continue;
            }

            try {
                const type = control.type || 'None';
                const module = await import(`./controls/${type}`);
                const controlObject: ControlBase = new module[type](this);
                await controlObject.loadAsync('device', uuid, control);
                this.storeRoomAndCat(control, uuid);
            } catch (e) {
                this.log.error('Unsupported control type ' + control.type + ': ' + e);

                if (!hasUnsupported) {
                    hasUnsupported = true;
                    await this.updateObjectAsync('Unsupported', {
                        type: 'device',
                        common: {
                            name: 'Unsupported',
                            role: 'info',
                        },
                        native: control,
                    });
                }

                await this.updateObjectAsync('Unsupported.' + uuid, {
                    type: 'state',
                    common: {
                        name: control.name,
                        read: true,
                        write: false,
                        type: 'string',
                        role: 'text',
                    },
                    native: control,
                });
            }
        }
    }

    private async loadSubControlsAsync(parentUuid: string, control: any): Promise<void> {
        if (!control.hasOwnProperty('subControls')) {
            return;
        }
        for (let uuid in control.subControls) {
            const subControl = control.subControls[uuid];
            if (!subControl.hasOwnProperty('type')) {
                continue;
            }

            try {
                if (uuid.startsWith(parentUuid + '/')) {
                    uuid = uuid.replace('/', '.');
                } else {
                    uuid = parentUuid + '.' + uuid.replace('/', '-');
                }
                subControl.name = control.name + ': ' + subControl.name;
                eval('load' + subControl.type + "Control('channel', uuid, subControl)");
                this.storeRoomAndCat(subControl, uuid);
            } catch (e) {
                this.log.error('Unsupported sub-control type ' + subControl.type + ': ' + e);
            }
        }
    }

    private storeRoomAndCat(control: any, uuid: string): void {
        if (control.hasOwnProperty('room')) {
            if (!this.foundRooms.hasOwnProperty(control.room)) {
                this.foundRooms[control.room as string] = [];
            }

            this.foundRooms[control.room].push(uuid);
        }

        if (control.hasOwnProperty('cat')) {
            if (!this.foundCats.hasOwnProperty(control.cat)) {
                this.foundCats[control.cat] = [];
            }

            this.foundCats[control.cat].push(uuid);
        }
    }

    private handleEvent(uuid: string, evt: any): void {
        const stateEventHandlerList = this.stateEventHandlers[uuid];
        if (stateEventHandlerList === undefined) {
            this.log.debug('Unknown event UUID: ' + uuid);
            return;
        }

        stateEventHandlerList.forEach((item: StateEventRegistration) => {
            try {
                item.handler(evt);
            } catch (e) {
                this.log.error('Error while handling event UUID ' + uuid + ': ' + e);
            }
        });
    }

    public sendCommand(uuid: string, action: string): void {
        this.client.send_cmd(uuid, action);
    }

    public async updateObjectAsync(id: string, obj: ioBroker.PartialObject): Promise<void> {
        // TODO: fix
        /*
        const fullId = this.namespace + '.' + id;
        if (this.existingObjects.hasOwnProperty(fullId)) {
            const existingObject = this.existingObjects[fullId];
            if (!this.config.syncNames && obj.common) {
                obj.common.name = existingObject.common.name;
            }
            if (obj.common.smartName != 'ignore' && existingObject.common.smartName != 'ignore') {
                // keep the smartName (if it's not supposed to be ignored)
                obj.common.smartName = existingObject.common.smartName;
            }
        }*/

        await this.extendObjectAsync(id, obj);
    }

    public async updateStateObjectAsync(
        id: string,
        commonInfo: any,
        stateUuid: string,
        stateEventHandler?: NamedStateEventHandler,
    ): Promise<void> {
        if (commonInfo.hasOwnProperty('smartIgnore')) {
            // interpret smartIgnore (our own extension of common) to generate smartName if needed
            if (commonInfo.smartIgnore) {
                commonInfo.smartName = 'ignore';
            } else if (!commonInfo.hasOwnProperty('smartName')) {
                commonInfo.smartName = null;
            }
            delete commonInfo.smartIgnore;
        }
        // TODO: fix this, shouldn't be "any"
        const obj: any = {
            type: 'state',
            common: commonInfo,
            native: {
                uuid: stateUuid,
            },
        };
        await this.updateObjectAsync(id, obj);
        if (stateEventHandler) {
            this.addStateEventHandler(stateUuid, (value: StateValue) => {
                stateEventHandler(id, value);
            });
        }
    }

    public addStateEventHandler(uuid: string, eventHandler: StateEventHandler, name?: string): void {
        if (this.stateEventHandlers[uuid] === undefined) {
            this.stateEventHandlers[uuid] = [];
        }

        if (name) {
            this.removeStateEventHandler(uuid, name);
        }

        this.stateEventHandlers[uuid].push({ name: name, handler: eventHandler });
    }

    public removeStateEventHandler(uuid: string, name: string): boolean {
        if (this.stateEventHandlers[uuid] === undefined || !name) {
            return false;
        }

        let found = false;
        for (let i = 0; i < this.stateEventHandlers[uuid].length; i++) {
            if (this.stateEventHandlers[uuid][i].name === name) {
                this.stateEventHandlers[uuid].splice(i, 1);
                found = true;
            }
        }

        return found;
    }

    public addStateChangeListener(id: string, listener: StateChangeListener): void {
        this.stateChangeListeners[this.namespace + '.' + id] = listener;
    }

    public setStateAck(id: string, value: StateValue | null): void {
        this.currentStateValues[this.namespace + '.' + id] = value;
        this.setState(id, { val: value, ack: true });
    }
}

if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Loxone(options);
} else {
    // otherwise start the instance directly
    (() => new Loxone())();
}
