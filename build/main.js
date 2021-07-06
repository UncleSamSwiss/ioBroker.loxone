"use strict";
/*
 * Created with @iobroker/create-adapter v1.26.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loxone = void 0;
const utils = require("@iobroker/adapter-core");
const SentryNode = require("@sentry/node");
const axios_1 = require("axios");
const loxoneWsApi = require("node-lox-ws-api");
const Unknown_1 = require("./controls/Unknown");
const weather_server_handler_1 = require("./weather-server-handler");
const FormData = require("form-data");
const Queue = require("queue-fifo");
class Loxone extends utils.Adapter {
    constructor(options = {}) {
        super({
            dirname: __dirname.indexOf('node_modules') !== -1 ? undefined : __dirname + '/../',
            ...options,
            name: 'loxone',
        });
        this.existingObjects = {};
        this.currentStateValues = {};
        this.operatingModes = {};
        this.foundRooms = {};
        this.foundCats = {};
        this.stateChangeListeners = {};
        this.stateEventHandlers = {};
        this.eventsQueue = new Queue();
        this.runQueue = false;
        this.queueRunning = false;
        this.reportedMissingControls = new Set();
        this.reportedUnsupportedStateChanges = new Set();
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
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
        this.client = new loxoneWsApi(this.config.host + ':' + this.config.port, this.config.username, this.config.password, true, 'AES-256-CBC');
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
        this.client.on('connection_error', (error) => {
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
        this.client.on('send', (message) => {
            this.log.debug('sent message: ' + message);
        });
        this.client.on('message_text', (message) => {
            this.log.debug('message_text ' + JSON.stringify(message));
        });
        this.client.on('message_file', (message) => {
            this.log.debug('message_file ' + JSON.stringify(message));
        });
        this.client.on('message_invalid', (message) => {
            this.log.debug('message_invalid ' + JSON.stringify(message));
        });
        this.client.on('keepalive', (time) => {
            this.log.silly('keepalive (' + time + 'ms)');
        });
        this.client.on('get_structure_file', async (data) => {
            this.log.silly(`get_structure_file ${JSON.stringify(data)}`);
            this.log.info(`got structure file; last modified on ${data.lastModified}`);
            const sentry = this.getSentry();
            if (sentry) {
                // add a global event processor to upload the structure file (only once)
                sentry.addGlobalEventProcessor(this.createSentryEventProcessor(data));
            }
            try {
                await this.loadStructureFileAsync(data);
                this.log.debug('structure file successfully loaded');
                // we are ready, let's set the connection indicator
                this.setState('info.connection', true, true);
            }
            catch (error) {
                this.log.error(`Couldn't load structure file: ${error}`);
                sentry === null || sentry === void 0 ? void 0 : sentry.captureException(error, { extra: { data } });
            }
        });
        const handleAnyEvent = (uuid, evt) => {
            this.log.silly(`received update event: ${JSON.stringify(evt)}: ${uuid}`);
            this.eventsQueue.enqueue({ uuid, evt });
            this.handleEventQueue().catch((e) => {
                var _a;
                this.log.error(`Unhandled error in event ${uuid}: ${e}`);
                (_a = this.getSentry()) === null || _a === void 0 ? void 0 : _a.captureException(e, { extra: { uuid, evt } });
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
    onUnload(callback) {
        try {
            if (this.client) {
                this.client.close();
                delete this.client;
            }
            callback();
        }
        catch (e) {
            callback();
        }
    }
    /**
     * Is called if a subscribed state changes
     */
    onStateChange(id, state) {
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
                sentry === null || sentry === void 0 ? void 0 : sentry.withScope((scope) => {
                    scope.setExtra('state', state);
                    sentry.captureMessage(msg, SentryNode.Severity.Warning);
                });
            }
            return;
        }
        this.stateChangeListeners[id](this.currentStateValues[id], state.val);
    }
    createSentryEventProcessor(data) {
        const sentry = this.getSentry();
        let attachmentEventId;
        return async (event) => {
            var _a;
            try {
                if (attachmentEventId) {
                    // structure file was already added
                    if (event.breadcrumbs) {
                        event.breadcrumbs.push({
                            type: 'debug',
                            category: 'started',
                            message: `Structure file added to event ${attachmentEventId}`,
                            level: SentryNode.Severity.Info,
                        });
                    }
                    return event;
                }
                const dsn = (_a = sentry.getCurrentHub().getClient()) === null || _a === void 0 ? void 0 : _a.getDsn();
                if (!dsn || !event.event_id) {
                    return event;
                }
                attachmentEventId = event.event_id;
                const { host, path, projectId, port, protocol, user } = dsn;
                const endpoint = `${protocol}://${host}${port !== '' ? `:${port}` : ''}${path !== '' ? `/${path}` : ''}/api/${projectId}/events/${attachmentEventId}/attachments/?sentry_key=${user}&sentry_version=7&sentry_client=custom-javascript`;
                const form = new FormData();
                form.append('att', JSON.stringify(data, null, 2), {
                    contentType: 'application/json',
                    filename: 'LoxAPP3.json',
                });
                await axios_1.default.post(endpoint, form, { headers: form.getHeaders() });
                return event;
            }
            catch (ex) {
                this.log.error(`Couldn't upload structure file attachment to sentry: ${ex}`);
            }
            return event;
        };
    }
    async loadStructureFileAsync(data) {
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
    async loadGlobalStatesAsync(globalStates) {
        const globalStateInfos = {
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
        const defaultInfo = {
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
            await this.updateStateObjectAsync(globalStateName, {
                name: globalStateName,
                read: true,
                write: false,
                type: info.type,
                role: info.role,
            }, globalStates[globalStateName], info.handler);
        }
    }
    async setOperatingMode(name, value) {
        await this.setStateAck(name, value);
        await this.setStateAck(name + '-text', this.operatingModes[value]);
    }
    async loadControlsAsync(controls) {
        var _a;
        let hasUnsupported = false;
        for (const uuid in controls) {
            const control = controls[uuid];
            if (!control.hasOwnProperty('type')) {
                continue;
            }
            try {
                await this.loadControlAsync('device', uuid, control);
            }
            catch (e) {
                this.log.info(`Currently unsupported control type ${control.type}: ${e}`);
                (_a = this.getSentry()) === null || _a === void 0 ? void 0 : _a.captureException(e, { extra: { uuid, control } });
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
                    native: { control },
                });
            }
        }
    }
    async loadSubControlsAsync(parentUuid, control) {
        var _a;
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
                }
                else {
                    uuid = parentUuid + '.' + uuid.replace('/', '-');
                }
                subControl.name = control.name + ': ' + subControl.name;
                await this.loadControlAsync('channel', uuid, subControl);
            }
            catch (e) {
                this.log.info(`Currently unsupported sub-control type ${subControl.type}: ${e}`);
                (_a = this.getSentry()) === null || _a === void 0 ? void 0 : _a.captureException(e, { extra: { uuid, subControl } });
            }
        }
    }
    async loadControlAsync(controlType, uuid, control) {
        const type = control.type || 'None';
        if (type.match(/[^a-z0-9]/i)) {
            throw new Error(`Bad control type: ${type}`);
        }
        let controlObject;
        try {
            const module = await Promise.resolve().then(() => require(`./controls/${type}`));
            controlObject = new module[type](this);
        }
        catch (error) {
            controlObject = new Unknown_1.Unknown(this);
        }
        await controlObject.loadAsync(controlType, uuid, control);
        if (control.hasOwnProperty('room')) {
            if (!this.foundRooms.hasOwnProperty(control.room)) {
                this.foundRooms[control.room] = [];
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
    async loadEnumsAsync(values, enumName, found, enabled) {
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
    async updateEnumObjectAsync(id, newObj) {
        // TODO: the parameter newObj should be an EnumObject, but currently that doesn't exist in the type definition
        // similar to hm-rega.js:
        let obj = await this.getForeignObjectAsync(id);
        let changed = false;
        if (!obj) {
            obj = newObj;
            changed = true;
        }
        else if (newObj && newObj.common && newObj.common.members) {
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
    async loadWeatherServerAsync(data) {
        if (this.config.weatherServer === 'off') {
            this.log.debug('WeatherServer is disabled in the adapter configuration');
            return;
        }
        const handler = new weather_server_handler_1.WeatherServerHandler(this);
        await handler.loadAsync(data, this.config.weatherServer || 'all');
    }
    async handleEventQueue() {
        // TODO: This solution with globals for runQueue & queueRunning
        // isn't very elegant. It works, but is there a better way?
        if (!this.runQueue) {
            this.log.silly('Asked to handle the queue, but is stopped');
        }
        else if (this.queueRunning) {
            this.log.silly('Asked to handle the queue, but already in progress');
        }
        else {
            this.queueRunning = true;
            this.log.silly('Processing events from queue length: ' + this.eventsQueue.size());
            let evt;
            while ((evt = this.eventsQueue.dequeue())) {
                this.log.silly(`Dequeued event UUID: ${evt.uuid}`);
                await this.handleEvent(evt);
            }
            this.queueRunning = false;
            this.log.silly('Done with event queue');
        }
    }
    async handleEvent(evt) {
        var _a;
        const stateEventHandlerList = this.stateEventHandlers[evt.uuid];
        if (stateEventHandlerList === undefined) {
            this.log.debug(`Unknown event ${evt.uuid}: ${JSON.stringify(evt.evt)}`);
            return;
        }
        for (const item of stateEventHandlerList) {
            try {
                await item.handler(evt.evt);
            }
            catch (e) {
                this.log.error(`Error while handling event UUID ${evt.uuid}: ${e}`);
                (_a = this.getSentry()) === null || _a === void 0 ? void 0 : _a.captureException(e, { extra: { evt } });
            }
        }
    }
    sendCommand(uuid, action) {
        this.log.debug(`Sending command ${uuid} ${action}`);
        this.client.send_cmd(uuid, action);
    }
    getExistingObject(id) {
        const fullId = this.namespace + '.' + id;
        if (this.existingObjects.hasOwnProperty(fullId)) {
            return this.existingObjects[fullId];
        }
        return undefined;
    }
    async updateObjectAsync(id, obj) {
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
    async updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler) {
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
        const obj = {
            type: 'state',
            common: commonInfo,
            native: {
                uuid: stateUuid,
            },
        };
        await this.updateObjectAsync(id, obj);
        if (stateEventHandler) {
            this.addStateEventHandler(stateUuid, async (value) => {
                await stateEventHandler(id, value);
            });
        }
    }
    addStateEventHandler(uuid, eventHandler, name) {
        if (this.stateEventHandlers[uuid] === undefined) {
            this.stateEventHandlers[uuid] = [];
        }
        if (name) {
            this.removeStateEventHandler(uuid, name);
        }
        this.stateEventHandlers[uuid].push({ name: name, handler: eventHandler });
    }
    removeStateEventHandler(uuid, name) {
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
    addStateChangeListener(id, listener) {
        this.stateChangeListeners[this.namespace + '.' + id] = listener;
    }
    async setStateAck(id, value) {
        this.currentStateValues[this.namespace + '.' + id] = value;
        await this.setStateAsync(id, { val: value, ack: true });
    }
    getCachedStateValue(id) {
        const keyId = this.namespace + '.' + id;
        if (this.currentStateValues.hasOwnProperty(keyId)) {
            return this.currentStateValues[keyId];
        }
        return undefined;
    }
    getSentry() {
        if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
            const sentryInstance = this.getPluginInstance('sentry');
            if (sentryInstance) {
                return sentryInstance.getSentryObject();
            }
        }
    }
    reportError(message) {
        var _a;
        this.log.error(message);
        (_a = this.getSentry()) === null || _a === void 0 ? void 0 : _a.captureMessage(message, SentryNode.Severity.Error);
    }
}
exports.Loxone = Loxone;
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new Loxone(options);
}
else {
    // otherwise start the instance directly
    (() => new Loxone())();
}
//# sourceMappingURL=main.js.map