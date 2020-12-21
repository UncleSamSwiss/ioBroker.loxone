"use strict";
/*
 * Created with @iobroker/create-adapter v1.26.0
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loxone = void 0;
const utils = require("@iobroker/adapter-core");
const loxoneWsApi = require("node-lox-ws-api");
const weather_server_handler_1 = require("./weather-server-handler");
const Queue = require("queue-fifo");
class Loxone extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({ dirname: __dirname.indexOf('node_modules') !== -1 ? undefined : __dirname + '/../' }, options), { name: 'loxone' }));
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
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady() {
        return __awaiter(this, void 0, void 0, function* () {
            // store all current (acknowledged) state values
            const allStates = yield this.getStatesAsync('*');
            for (const id in allStates) {
                if (allStates[id] && allStates[id].ack) {
                    this.currentStateValues[id] = allStates[id].val;
                }
            }
            // store all existing objects for later use
            this.existingObjects = yield this.getAdapterObjectsAsync();
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
            this.client.on('get_structure_file', (data) => __awaiter(this, void 0, void 0, function* () {
                this.log.silly('get_structure_file ' + JSON.stringify(data));
                this.log.info('got structure file; last modified on ' + data.lastModified);
                try {
                    yield this.loadStructureFileAsync(data);
                    this.log.debug('structure file successfully loaded');
                    // we are ready, let's set the connection indicator
                    this.setState('info.connection', true, true);
                }
                catch (error) {
                    this.log.error(`Couldn't load structure file: ${error}`);
                }
            }));
            const handleAnyEvent = (uuid, evt) => {
                this.log.silly(`received update event: ${JSON.stringify(evt)}: ${uuid}`);
                this.log.debug(`Enqueue event: ${uuid}`);
                this.eventsQueue.enqueue({ uuid, evt });
                this.handleEventQueue().catch((e) => this.log.error(`Unhandled error in event ${uuid}: ${e}`));
            };
            this.client.on('update_event_value', handleAnyEvent);
            this.client.on('update_event_text', handleAnyEvent);
            this.client.on('update_event_daytimer', handleAnyEvent);
            this.client.on('update_event_weather', handleAnyEvent);
            this.client.connect();
            this.subscribeStates('*');
        });
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
            this.log.error('Unsupported state change: ' + id);
            return;
        }
        this.stateChangeListeners[id](this.currentStateValues[id], state.val);
    }
    loadStructureFileAsync(data) {
        return __awaiter(this, void 0, void 0, function* () {
            this.stateEventHandlers = {};
            this.foundRooms = {};
            this.foundCats = {};
            this.operatingModes = data.operatingModes;
            yield this.loadGlobalStatesAsync(data.globalStates);
            yield this.loadControlsAsync(data.controls);
            yield this.loadEnumsAsync(data.rooms, 'enum.rooms', this.foundRooms, this.config.syncRooms);
            yield this.loadEnumsAsync(data.cats, 'enum.functions', this.foundCats, this.config.syncFunctions);
            yield this.loadWeatherServerAsync(data.weatherServer);
            // replay all queued events
            this.runQueue = true;
            yield this.handleEventQueue();
        });
    }
    loadGlobalStatesAsync(globalStates) {
        return __awaiter(this, void 0, void 0, function* () {
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
            };
            const defaultInfo = {
                type: 'string',
                role: 'text',
                handler: this.setStateAck.bind(this),
            };
            // special case for operating mode (text)
            yield this.updateObjectAsync('operatingMode-text', {
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
                yield this.updateStateObjectAsync(globalStateName, {
                    name: globalStateName,
                    read: true,
                    write: false,
                    type: info.type,
                    role: info.role,
                }, globalStates[globalStateName], info.handler);
            }
        });
    }
    setOperatingMode(name, value) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setStateAck(name, value);
            yield this.setStateAck(name + '-text', this.operatingModes[value]);
        });
    }
    loadControlsAsync(controls) {
        return __awaiter(this, void 0, void 0, function* () {
            let hasUnsupported = false;
            for (const uuid in controls) {
                const control = controls[uuid];
                if (!control.hasOwnProperty('type')) {
                    continue;
                }
                try {
                    yield this.loadControlAsync('device', uuid, control);
                }
                catch (e) {
                    this.log.info(`Currently unsupported control type ${control.type}: ${e}`);
                    if (!hasUnsupported) {
                        hasUnsupported = true;
                        yield this.updateObjectAsync('Unsupported', {
                            type: 'device',
                            common: {
                                name: 'Unsupported',
                                role: 'info',
                            },
                            native: {},
                        });
                    }
                    yield this.updateObjectAsync('Unsupported.' + uuid, {
                        type: 'state',
                        common: {
                            name: control.name,
                            read: true,
                            write: false,
                            type: 'string',
                            role: 'text',
                        },
                        native: { control: control },
                    });
                }
            }
        });
    }
    loadSubControlsAsync(parentUuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    yield this.loadControlAsync('channel', uuid, subControl);
                }
                catch (e) {
                    this.log.info(`Currently unsupported sub-control type ${subControl.type}: ${e}`);
                }
            }
        });
    }
    loadControlAsync(controlType, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            const type = control.type || 'None';
            const module = yield Promise.resolve().then(() => require(`./controls/${type}`));
            const controlObject = new module[type](this);
            yield controlObject.loadAsync(controlType, uuid, control);
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
        });
    }
    loadEnumsAsync(values, enumName, found, enabled) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this.updateEnumObjectAsync(enumName + '.' + name, obj);
            }
        });
    }
    updateEnumObjectAsync(id, newObj) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: the parameter newObj should be an EnumObject, but currently that doesn't exist in the type definition
            // similar to hm-rega.js:
            let obj = yield this.getForeignObjectAsync(id);
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
                yield this.setForeignObjectAsync(id, obj);
            }
        });
    }
    loadWeatherServerAsync(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const handler = new weather_server_handler_1.WeatherServerHandler(this);
            yield handler.loadAsync(data);
        });
    }
    handleEventQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: This solution with globals for runQueue & queueRunning
            // isn't very elegant. It works, but is there a better way?
            if (!this.runQueue) {
                this.log.debug('Asked to handle the queue, but is stopped');
            }
            else if (this.queueRunning) {
                this.log.debug('Asked to handle the queue, but already in progress');
            }
            else {
                this.queueRunning = true;
                this.log.debug('Processing events from queue length: ' + this.eventsQueue.size());
                let evt;
                while ((evt = this.eventsQueue.dequeue())) {
                    this.log.debug(`Dequeued event UUID: ${evt.uuid}`);
                    yield this.handleEvent(evt);
                }
                this.queueRunning = false;
                this.log.debug('Done with event queue');
            }
        });
    }
    handleEvent(evt) {
        return __awaiter(this, void 0, void 0, function* () {
            const stateEventHandlerList = this.stateEventHandlers[evt.uuid];
            if (stateEventHandlerList === undefined) {
                this.log.debug('Unknown event UUID: ' + evt.uuid);
                return;
            }
            for (const item of stateEventHandlerList) {
                try {
                    yield item.handler(evt.evt);
                }
                catch (e) {
                    this.log.error(`Error while handling event UUID ${evt.uuid}: ${e}`);
                }
            }
        });
    }
    sendCommand(uuid, action) {
        this.log.debug(`Sending command ${uuid} ${action}`);
        this.client.send_cmd(uuid, action);
    }
    updateObjectAsync(id, obj) {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.extendObjectAsync(id, obj);
        });
    }
    updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler) {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.updateObjectAsync(id, obj);
            if (stateEventHandler) {
                this.addStateEventHandler(stateUuid, (value) => __awaiter(this, void 0, void 0, function* () {
                    yield stateEventHandler(id, value);
                }));
            }
        });
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
    setStateAck(id, value) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentStateValues[this.namespace + '.' + id] = value;
            yield this.setStateAsync(id, { val: value, ack: true });
        });
    }
    getCachedStateValue(id) {
        if (this.currentStateValues.hasOwnProperty(id)) {
            return this.currentStateValues[id];
        }
        return undefined;
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