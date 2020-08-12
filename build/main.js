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
            this.client.on('connection_error', (error) => {
                this.log.error('Miniserver connection error: ' + error);
            });
            this.client.on('close', () => {
                this.log.info('connection closed');
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
                yield this.loadStructureFileAsync(data);
            }));
            const handleAnyEvent = (uuid, evt) => {
                this.log.silly('received update event: ' + JSON.stringify(evt) + ':' + uuid);
                this.handleEvent(uuid, evt);
            };
            this.client.on('update_event_value', handleAnyEvent);
            this.client.on('update_event_text', handleAnyEvent);
            this.client.on('update_event_daytimer', handleAnyEvent);
            this.client.on('update_event_weather', handleAnyEvent);
            this.subscribeStates('*');
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);
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
        this.log.silly('stateChange ' + id + ' ' + JSON.stringify(state));
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
            // TODO: implement:
            /*this.loadEnums(data.rooms, 'enum.rooms', this.config.syncRooms);
            this.loadEnums(data.cats, 'enum.functions', this.config.syncFunctions);
            this.loadWeatherServer(data.weatherServer);*/
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
        this.setStateAck(name, value);
        this.setStateAck(name + '-text', this.operatingModes[value]);
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
                    this.log.error('Unsupported control type ' + control.type + ': ' + e);
                    if (!hasUnsupported) {
                        hasUnsupported = true;
                        yield this.updateObjectAsync('Unsupported', {
                            type: 'device',
                            common: {
                                name: 'Unsupported',
                                role: 'info',
                            },
                            native: control,
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
                        native: control,
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
                    this.log.error('Unsupported sub-control type ' + subControl.type + ': ' + e);
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
    handleEvent(uuid, evt) {
        const stateEventHandlerList = this.stateEventHandlers[uuid];
        if (stateEventHandlerList === undefined) {
            this.log.debug('Unknown event UUID: ' + uuid);
            return;
        }
        stateEventHandlerList.forEach((item) => {
            try {
                item.handler(evt);
            }
            catch (e) {
                this.log.error('Error while handling event UUID ' + uuid + ': ' + e);
            }
        });
    }
    sendCommand(uuid, action) {
        this.client.send_cmd(uuid, action);
    }
    updateObjectAsync(id, obj) {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.extendObjectAsync(id, obj);
        });
    }
    updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            if (commonInfo.hasOwnProperty('smartIgnore')) {
                // interpret smartIgnore (our own extension of common) to generate smartName if needed
                if (commonInfo.smartIgnore) {
                    commonInfo.smartName = 'ignore';
                }
                else if (!commonInfo.hasOwnProperty('smartName')) {
                    commonInfo.smartName = null;
                }
                delete commonInfo.smartIgnore;
            }
            // TODO: fix this, shouldn't be "any"
            const obj = {
                type: 'state',
                common: commonInfo,
                native: {
                    uuid: stateUuid,
                },
            };
            yield this.updateObjectAsync(id, obj);
            if (stateEventHandler) {
                this.addStateEventHandler(stateUuid, (value) => {
                    stateEventHandler(id, value);
                });
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
        this.currentStateValues[this.namespace + '.' + id] = value;
        this.setState(id, { val: value, ack: true });
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