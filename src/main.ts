/*
 * Created with @iobroker/create-adapter v1.26.0
 */

import * as utils from '@iobroker/adapter-core';
import * as SentryNode from '@sentry/node';
import * as loxoneWsApi from 'node-lox-ws-api';
import { ControlBase, ControlType } from './controls/control-base';
import { Control, Controls, GlobalStates, OperatingModes, StructureFile, WeatherServer } from './structure-file';
import { WeatherServerHandler } from './weather-server-handler';
import Queue = require('queue-fifo');

export type StateValue = Exclude<ioBroker.State['val'], null>;

export type OldStateValue = StateValue | null | undefined;
export type CurrentStateValue = StateValue | null;
export type StateChangeListener = (oldValue: OldStateValue, newValue: CurrentStateValue) => void;
export type StateEventHandler = (value: any) => Promise<void>;
export type StateEventRegistration = { name?: string; handler: StateEventHandler };
export type NamedStateEventHandler = (id: string, value: any) => Promise<void>;
export type LoxoneEvent = { uuid: string; evt: any };
export type Sentry = typeof SentryNode;

export class Loxone extends utils.Adapter {
    private client?: any;
    private existingObjects: Record<string, ioBroker.Object> = {};
    private currentStateValues: Record<string, CurrentStateValue> = {};
    private structureFile?: StructureFile;
    private operatingModes: OperatingModes = {};
    private foundRooms: Record<string, string[]> = {};
    private foundCats: Record<string, string[]> = {};

    private stateChangeListeners: Record<string, StateChangeListener> = {};
    private stateEventHandlers: Record<string, StateEventRegistration[]> = {};

    private readonly eventsQueue = new Queue<LoxoneEvent>();
    private runQueue = false;
    private queueRunning = false;

    private readonly reportedMissingControls = new Set<string>();
    private readonly reportedUnsupportedStateChanges = new Set<string>();

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

        this.client.on('connect', () => {
            this.log.info('Miniserver connected');
        });

        this.client.on('authorized', () => {
            this.log.debug('authorized');
        });

        this.client.on('auth_failed', () => {
            this.log.error('Miniserver auth failed');
        });

        this.client.on('connect_failed', () => {
            this.log.error('Miniserver connect failed');
        });

        this.client.on('connection_error', (error: any) => {
            this.log.error('Miniserver connection error: ' + error);
        });

        this.client.on('close', () => {
            this.log.info('connection closed');
            // Stop queue and clear it. Issue a warning if it isn't empty.
            this.runQueue = false;
            if (this.eventsQueue.size() > 0) {
                this.log.warn('Event queue is not empty. Discarding ' + this.eventsQueue.size() + ' items');
            }
            // Yes - I know this could go in the 'if' above but here 'just in case' ;)
            this.eventsQueue.clear();
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

        this.client.on('get_structure_file', async (data: StructureFile) => {
            this.log.silly('get_structure_file ' + JSON.stringify(data));
            this.log.info('got structure file; last modified on ' + data.lastModified);
            this.structureFile = data;

            try {
                await this.loadStructureFileAsync(data);
                this.log.debug('structure file successfully loaded');

                // we are ready, let's set the connection indicator
                this.setState('info.connection', true, true);
            } catch (error) {
                this.log.error(`Couldn't load structure file: ${error}`);
                this.getSentry()?.captureException(error, { extra: { data } });
            }
        });

        const handleAnyEvent = (uuid: string, evt: any): void => {
            this.log.silly(`received update event: ${JSON.stringify(evt)}: ${uuid}`);
            this.eventsQueue.enqueue({ uuid, evt });
            this.handleEventQueue().catch((e) => {
                this.log.error(`Unhandled error in event ${uuid}: ${e}`);
                this.getSentry()?.captureException(e, { extra: { uuid, evt } });
            });
        };

        this.client.on('update_event_value', handleAnyEvent);
        this.client.on('update_event_text', handleAnyEvent);
        this.client.on('update_event_daytimer', handleAnyEvent);
        this.client.on('update_event_weather', handleAnyEvent);

        this.client.connect();

        this.subscribeStates('*');
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        try {
            if (this.client) {
                this.client.close();
                delete this.client;
            }
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

        this.log.silly(`stateChange ${id} ${JSON.stringify(state)}`);
        if (!this.stateChangeListeners.hasOwnProperty(id)) {
            const msg = 'Unsupported state change: ' + id;
            this.log.error(msg);
            if (!this.reportedUnsupportedStateChanges.has(id)) {
                this.reportedUnsupportedStateChanges.add(id);
                const sentry = this.getSentry();
                sentry?.withScope((scope) => {
                    scope.setExtra('state', state);
                    scope.setExtra('structureFile', JSON.stringify(this.structureFile, null, 2));
                    sentry.captureMessage(msg, SentryNode.Severity.Warning);
                });
            }
            return;
        }

        this.stateChangeListeners[id](this.currentStateValues[id], state.val);
    }

    private async loadStructureFileAsync(data: StructureFile): Promise<void> {
        this.stateEventHandlers = {};
        this.foundRooms = {};
        this.foundCats = {};
        this.operatingModes = data.operatingModes;
        await this.loadGlobalStatesAsync(data.globalStates);
        await this.loadControlsAsync(data.controls);
        await this.loadEnumsAsync(data.rooms, 'enum.rooms', this.foundRooms, this.config.syncRooms);
        await this.loadEnumsAsync(data.cats, 'enum.functions', this.foundCats, this.config.syncFunctions);
        await this.loadWeatherServerAsync(data.weatherServer);

        // replay all queued events
        this.runQueue = true;
        await this.handleEventQueue();
    }

    private async loadGlobalStatesAsync(globalStates: GlobalStates): Promise<void> {
        interface GlobalStateInfo {
            type: ioBroker.CommonType;
            role: string;
            handler: (name: string, value: StateValue) => Promise<void>;
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
            hasInternet: {
                type: 'boolean',
                role: 'indicator',
                handler: (name, value) => this.setStateAck(name, value === 1),
            },
        };
        const defaultInfo: GlobalStateInfo = {
            type: 'string',
            role: 'text',
            handler: (name, value) => this.setStateAck(name, `${value}`),
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

    private async setOperatingMode(name: string, value: any): Promise<void> {
        await this.setStateAck(name, value);
        await this.setStateAck(name + '-text', this.operatingModes[value]);
    }

    private async loadControlsAsync(controls: Controls): Promise<void> {
        let hasUnsupported = false;
        for (const uuid in controls) {
            const control = controls[uuid];
            if (!control.hasOwnProperty('type')) {
                continue;
            }

            try {
                await this.loadControlAsync('device', uuid, control);
            } catch (e) {
                this.log.info(`Currently unsupported control type ${control.type}: ${e}`);
                this.getSentry()?.captureException(e, { extra: { uuid, control } });

                if (!hasUnsupported) {
                    hasUnsupported = true;
                    await this.updateObjectAsync('Unsupported', {
                        type: 'device',
                        common: {
                            name: 'Unsupported',
                            role: 'info',
                        },
                        native: {},
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
                    native: { control: control as any },
                });
            }
        }
    }

    public async loadSubControlsAsync(parentUuid: string, control: Control): Promise<void> {
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

                await this.loadControlAsync('channel', uuid, subControl);
            } catch (e) {
                this.log.info(`Currently unsupported sub-control type ${subControl.type}: ${e}`);
                this.getSentry()?.captureException(e, { extra: { uuid, subControl } });
            }
        }
    }

    private async loadControlAsync(controlType: ControlType, uuid: string, control: Control): Promise<void> {
        const type = control.type || 'None';
        if (type.match(/[^a-z0-9]/i)) {
            throw new Error(`Bad control type: ${type}`);
        }

        let controlObject: ControlBase;
        try {
            const module = await import(`./controls/${type}`);
            controlObject = new module[type](this);
        } catch (error) {
            const msg = `Unsupported ${controlType} control ${type}`;
            if (!this.reportedMissingControls.has(msg)) {
                this.reportedMissingControls.add(msg);
                const sentry = this.getSentry();
                sentry?.withScope((scope) => {
                    scope.setExtra('control', JSON.stringify(control, null, 2));
                    sentry.captureMessage(msg, SentryNode.Severity.Warning);
                });
            }
            throw error;
        }
        await controlObject.loadAsync(controlType, uuid, control);

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

    private async loadEnumsAsync(
        values: Record<string, any>,
        enumName: string,
        found: Record<string, string[]>,
        enabled: boolean,
    ): Promise<void> {
        if (!enabled) {
            return;
        }

        for (const uuid in values) {
            if (!found.hasOwnProperty(uuid)) {
                // don't sync room/cat if we have no control that is using it
                continue;
            }

            const members = [];
            for (const i in found[uuid]) {
                members.push(this.namespace + '.' + found[uuid][i]);
            }

            const item = values[uuid];
            const name = item.name.replace(/[\][*.,;'"`<>\\?]+/g, '_');
            const obj = {
                type: 'enum',
                common: {
                    name: name,
                    members: members,
                },
                native: item,
            };

            await this.updateEnumObjectAsync(enumName + '.' + name, obj);
        }
    }

    private async updateEnumObjectAsync(id: string, newObj: any): Promise<void> {
        // TODO: the parameter newObj should be an EnumObject, but currently that doesn't exist in the type definition
        // similar to hm-rega.js:
        let obj: any = await this.getForeignObjectAsync(id);
        let changed = false;
        if (!obj) {
            obj = newObj;
            changed = true;
        } else if (newObj && newObj.common && newObj.common.members) {
            obj.common = obj.common || {};
            obj.common.members = obj.common.members || [];
            for (let m = 0; m < newObj.common.members.length; m++) {
                if (obj.common.members.indexOf(newObj.common.members[m]) === -1) {
                    changed = true;
                    obj.common.members.push(newObj.common.members[m]);
                }
            }
        }
        if (changed) {
            await this.setForeignObjectAsync(id, obj);
        }
    }

    private async loadWeatherServerAsync(data: WeatherServer): Promise<void> {
        const handler = new WeatherServerHandler(this);
        await handler.loadAsync(data);
    }

    private async handleEventQueue(): Promise<void> {
        // TODO: This solution with globals for runQueue & queueRunning
        // isn't very elegant. It works, but is there a better way?
        if (!this.runQueue) {
            this.log.silly('Asked to handle the queue, but is stopped');
        } else if (this.queueRunning) {
            this.log.silly('Asked to handle the queue, but already in progress');
        } else {
            this.queueRunning = true;
            this.log.silly('Processing events from queue length: ' + this.eventsQueue.size());
            let evt: LoxoneEvent | null;
            while ((evt = this.eventsQueue.dequeue())) {
                this.log.silly(`Dequeued event UUID: ${evt.uuid}`);
                await this.handleEvent(evt);
            }
            this.queueRunning = false;
            this.log.silly('Done with event queue');
        }
    }

    private async handleEvent(evt: LoxoneEvent): Promise<void> {
        const stateEventHandlerList = this.stateEventHandlers[evt.uuid];
        if (stateEventHandlerList === undefined) {
            this.log.debug('Unknown event UUID: ' + evt.uuid);
            return;
        }

        for (const item of stateEventHandlerList) {
            try {
                await item.handler(evt.evt);
            } catch (e) {
                this.log.error(`Error while handling event UUID ${evt.uuid}: ${e}`);
                this.getSentry()?.captureException(e, { extra: { evt } });
            }
        }
    }

    public sendCommand(uuid: string, action: string): void {
        this.log.debug(`Sending command ${uuid} ${action}`);
        this.client.send_cmd(uuid, action);
    }

    public async updateObjectAsync(id: string, obj: ioBroker.SettableObject): Promise<void> {
        const fullId = this.namespace + '.' + id;
        if (this.existingObjects.hasOwnProperty(fullId)) {
            const existingObject = this.existingObjects[fullId];
            if (!this.config.syncNames && obj.common) {
                obj.common.name = existingObject.common.name;
            }
            /* TODO: re-add:
            if (obj.common.smartName != 'ignore' && existingObject.common.smartName != 'ignore') {
                // keep the smartName (if it's not supposed to be ignored)
                obj.common.smartName = existingObject.common.smartName;
            }*/
        }

        await this.extendObjectAsync(id, obj);
    }

    public async updateStateObjectAsync(
        id: string,
        commonInfo: ioBroker.StateCommon,
        stateUuid: string,
        stateEventHandler?: NamedStateEventHandler,
    ): Promise<void> {
        /* TODO: re-add:
        if (commonInfo.hasOwnProperty('smartIgnore')) {
            // interpret smartIgnore (our own extension of common) to generate smartName if needed
            if (commonInfo.smartIgnore) {
                commonInfo.smartName = 'ignore';
            } else if (!commonInfo.hasOwnProperty('smartName')) {
                commonInfo.smartName = null;
            }
            delete commonInfo.smartIgnore;
        }*/
        const obj: ioBroker.SettableObjectWorker<ioBroker.StateObject> = {
            type: 'state',
            common: commonInfo,
            native: {
                uuid: stateUuid,
            },
        };
        await this.updateObjectAsync(id, obj);
        if (stateEventHandler) {
            this.addStateEventHandler(stateUuid, async (value: StateValue) => {
                await stateEventHandler(id, value);
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

    public async setStateAck(id: string, value: CurrentStateValue): Promise<void> {
        this.currentStateValues[this.namespace + '.' + id] = value;
        await this.setStateAsync(id, { val: value, ack: true });
    }

    public getCachedStateValue(id: string): OldStateValue {
        const keyId = this.namespace + '.' + id;
        if (this.currentStateValues.hasOwnProperty(keyId)) {
            return this.currentStateValues[keyId];
        }

        return undefined;
    }

    public getSentry(): Sentry | undefined {
        if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
            const sentryInstance = this.getPluginInstance('sentry');
            if (sentryInstance) {
                return sentryInstance.getSentryObject();
            }
        }
    }

    public reportError(message: string): void {
        this.log.error(message);
        this.getSentry()?.captureMessage(message, SentryNode.Severity.Error);
    }
}

if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Loxone(options);
} else {
    // otherwise start the instance directly
    (() => new Loxone())();
}
