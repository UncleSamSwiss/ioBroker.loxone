"use strict";
/*
 * Created with @iobroker/create-adapter v1.26.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loxone = void 0;
const utils = require("@iobroker/adapter-core");
const SentryNode = require("@sentry/node");
const axios_1 = require("axios");
const LxCommunicator = require("lxcommunicator");
const uuid_1 = require("uuid");
const Unknown_1 = require("./controls/Unknown");
const weather_server_handler_1 = require("./weather-server-handler");
const FormData = require("form-data");
const Queue = require("queue-fifo");
const WebSocketConfig = LxCommunicator.WebSocketConfig;
// Log warnings if no ack event from Loxone in this time
// TODO: should this be configurable?
const ackTimeoutMs = 500;
class Loxone extends utils.Adapter {
    constructor(options = {}) {
        super({
            dirname: __dirname.indexOf('node_modules') !== -1 ? undefined : __dirname + '/../',
            ...options,
            name: 'loxone',
        });
        this.uuid = '';
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
        this.info = new Map();
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Init info
        await this.initInfoStates();
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
        this.uuid = (0, uuid_1.v4)();
        // connect to Loxone Miniserver
        const webSocketConfig = new WebSocketConfig(WebSocketConfig.protocol.WS, this.uuid, 'iobroker', WebSocketConfig.permission.APP, false);
        const handleAnyEvent = (uuid, evt) => {
            this.log.silly(`received update event: ${JSON.stringify(evt)}: ${uuid}`);
            this.eventsQueue.enqueue({ uuid, evt });
            this.handleEventQueue().catch((e) => {
                var _a;
                this.log.error(`Unhandled error in event ${uuid}: ${e}`);
                (_a = this.getSentry()) === null || _a === void 0 ? void 0 : _a.captureException(e, { extra: { uuid, evt } });
            });
        };
        webSocketConfig.delegate = {
            socketOnDataProgress: (socket, progress) => {
                this.log.debug('data progress ' + progress);
            },
            socketOnTokenConfirmed: (_socket, _response) => {
                this.log.debug('token confirmed');
            },
            socketOnTokenReceived: (_socket, _result) => {
                this.log.debug('token received');
            },
            socketOnConnectionClosed: (socket, code) => {
                this.log.info('Socket closed ' + code);
                // Stop queue and clear it. Issue a warning if it isn't empty.
                this.runQueue = false;
                if (this.eventsQueue.size() > 0) {
                    this.log.warn('Event queue is not empty. Discarding ' + this.eventsQueue.size() + ' items');
                }
                // Yes - I know this could go in the 'if' above but here 'just in case' ;)
                this.eventsQueue.clear();
                this.setState('info.connection', false, true);
                if (code != LxCommunicator.SupportCode.WEBSOCKET_MANUAL_CLOSE) {
                    this.reconnect();
                }
            },
            socketOnEventReceived: (socket, events, type) => {
                this.log.silly(`socket event received ${type} ${JSON.stringify(events)}`);
                this.incInfoState('info.messagesReceived');
                for (const evt of events) {
                    switch (type) {
                        case LxCommunicator.BinaryEvent.Type.EVENT:
                            handleAnyEvent(evt.uuid, evt.value);
                            break;
                        case LxCommunicator.BinaryEvent.Type.EVENTTEXT:
                            handleAnyEvent(evt.uuid, evt.text);
                            break;
                        case LxCommunicator.BinaryEvent.Type.EVENT:
                            handleAnyEvent(evt.uuid, evt);
                            break;
                        case LxCommunicator.BinaryEvent.Type.WEATHER:
                            handleAnyEvent(evt.uuid, evt);
                            break;
                        default:
                            break;
                    }
                }
            },
        };
        this.socket = new LxCommunicator.WebSocket(webSocketConfig);
        await this.connect();
        this.subscribeStates('*');
    }
    async connect() {
        this.log.info('Trying to connect');
        try {
            await this.socket.open(this.config.host + ':' + this.config.port, this.config.username, this.config.password);
        }
        catch (error) {
            // do not stringify error, it can contain circular references
            this.log.error(`Couldn't open socket`);
            this.reconnect();
            return false;
        }
        let file;
        try {
            const fileString = await this.socket.send('data/LoxAPP3.json');
            file = JSON.parse(fileString);
        }
        catch (error) {
            // do not stringify error, it can contain circular references
            this.log.error(`Couldn't get structure file`);
            this.reconnect();
            return false;
        }
        this.log.silly(`get_structure_file ${JSON.stringify(file)}`);
        this.log.info(`got structure file; last modified on ${file.lastModified}`);
        const sentry = this.getSentry();
        if (sentry) {
            // add a global event processor to upload the structure file (only once)
            sentry.addGlobalEventProcessor(this.createSentryEventProcessor(file));
        }
        try {
            await this.loadStructureFileAsync(file);
            this.log.debug('structure file successfully loaded');
            // we are ready, let's set the connection indicator
            this.setState('info.connection', true, true);
        }
        catch (error) {
            // do not stringify error, it can contain circular references
            this.log.error(`Couldn't load structure file`);
            sentry === null || sentry === void 0 ? void 0 : sentry.captureException(error, { extra: { file } });
            this.socket.close();
            this.reconnect();
            return false;
        }
        try {
            await this.socket.send('jdev/sps/enablebinstatusupdate');
        }
        catch (error) {
            // do not stringify error, it can contain circular references
            this.log.error(`Couldn't enable status updates`);
            this.socket.close();
            this.reconnect();
            return false;
        }
        return true;
    }
    reconnect() {
        if (this.reconnectTimer) {
            return;
        }
        this.reconnectTimer = this.setTimeout(() => {
            delete this.reconnectTimer;
            this.connect().catch((e) => {
                this.log.error(`Couldn't reconnect: ${e}`);
                this.reconnect();
            });
        }, 5000);
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            if (this.socket) {
                this.socket.close();
                delete this.socket;
            }
            callback();
        }
        catch (e) {
            callback();
        }
        this.flushInfoStates();
        // TODO: clear queued state change timers
    }
    /**
     * Is called if a subscribed state changes
     */
    async onStateChange(id, state) {
        // Warning: state can be null if it was deleted!
        if (!id || !state || state.ack) {
            // Do nothing
        }
        else if (id.includes('.info.')) {
            // Ignore info changes
            // TODO: can this be done better by ignoring '.info.' in subscribeStates?
        }
        else {
            this.log.debug(`stateChange ${id} ${JSON.stringify(state)}`);
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
            }
            else {
                const stateChangeListener = this.stateChangeListeners[id];
                if (stateChangeListener.ackTimer) {
                    // Ack timer is running: we didn't get a reply from the previous command yet
                    if (stateChangeListener.queuedVal !== null) {
                        // Already a queued state change: we're going to have to discard that and replace with latest
                        this.log.warn(`State change in progress for ${id}, discarding ${stateChangeListener.queuedVal}`);
                        this.incInfoState('info.stateChangesDiscarded');
                    }
                    else {
                        // Nothing queued, so this will only be delayed (at least for now)
                        this.log.warn(`State change in progress for ${id}, delaying ${state.val}`);
                        this.incInfoState('info.stateChangesDelayed');
                    }
                    stateChangeListener.queuedVal = state.val;
                }
                else {
                    // Ack timer is not running, so we're all good to handle this
                    await this.handleStateChange(id, stateChangeListener, state.val);
                }
            }
        }
    }
    convertStateToInt(value) {
        return !value ? 0 : parseInt(value.toString());
    }
    async handleStateChange(id, stateChangeListener, val) {
        var _a, _b, _c, _d;
        if ((_a = stateChangeListener.opts) === null || _a === void 0 ? void 0 : _a.convertToInt) {
            // Convert any values to ints within range if necessary.
            val = this.convertStateToInt(val);
            if (((_b = stateChangeListener.opts) === null || _b === void 0 ? void 0 : _b.minInt) !== undefined && val < stateChangeListener.opts.minInt) {
                val = stateChangeListener.opts.minInt;
            }
            if (((_c = stateChangeListener.opts) === null || _c === void 0 ? void 0 : _c.maxInt) !== undefined && val > stateChangeListener.opts.maxInt) {
                val = stateChangeListener.opts.maxInt;
            }
        }
        if (((_d = stateChangeListener.opts) === null || _d === void 0 ? void 0 : _d.notIfEqual) && this.currentStateValues[id] === val) {
            // new/old values are the same so don't send update.
            // However, ack the state change as we have 'handled' this (by doing nothing)
            this.log.debug(`State value is unchanged, no listener+self-ack: ${id} ${val}`);
            await this.setStateAck(id, val);
        }
        else {
            // Change will be handled by listener - set ack timeout and call it
            stateChangeListener.ackTimer = this.setTimeout(async (id, stateChangeListener) => {
                this.log.warn(`Timeout for ack ${id}`);
                this.incInfoState('info.ackTimeouts', id);
                stateChangeListener.ackTimer = null;
                // Even though this is a timeout, handle any change that may have been delayed waiting for this
                await this.handleDelayedStateChange(id, stateChangeListener);
            }, ackTimeoutMs, id, stateChangeListener);
            stateChangeListener.listener(this.currentStateValues[id], val);
        }
    }
    async handleDelayedStateChange(id, stateChangeListener) {
        if (stateChangeListener.queuedVal !== null) {
            this.log.debug(`Handling delayed state: ${id} ${stateChangeListener.queuedVal}`);
            await this.handleStateChange(id, stateChangeListener, stateChangeListener.queuedVal);
            stateChangeListener.queuedVal = null;
        }
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
            this.incInfoState('info.unknownEvents', evt.uuid, evt.evt);
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
    async initInfoStates() {
        // Wait for states to load because if we don't, although the chances
        // of processing starting before this actually completes is small, we
        // should cater for that.
        await this.initInfoState('info.ackTimeouts', true);
        await this.initInfoState('info.messagesReceived');
        await this.initInfoState('info.messagesSent');
        await this.initInfoState('info.stateChangesDelayed');
        await this.initInfoState('info.stateChangesDiscarded');
        await this.initInfoState('info.unknownEvents', true);
    }
    async initInfoState(id, hasDetails = false) {
        const state = await this.getStateAsync(id);
        const initValue = state ? state.val : null;
        const entry = {
            value: initValue,
            lastSet: initValue,
            timer: null,
        };
        if (hasDetails) {
            // TODO: Maybe read these in so they persist across restarts?
            entry.detailsMap = new Map();
        }
        this.info.set(id, entry);
    }
    flushInfoStates() {
        // Called on shutdown
        this.info.forEach((infoEntry, key) => {
            if (infoEntry.timer) {
                // Timer running, so cancel it and update state value if changed since last written
                this.clearTimeout(infoEntry.timer);
                this.setInfoStateIfChanged(key, infoEntry, true);
            }
        });
    }
    getInfoEntry(id) {
        const infoEntry = this.info.get(id);
        if (!infoEntry) {
            // This should never happen!
            this.log.error('No info entry for ' + id);
        }
        return infoEntry;
    }
    addInfoDetailsEntry(details, id, value) {
        /// ... and add details of this event to the map.
        const eventEntry = details.get(id);
        if (eventEntry) {
            // Add to existing
            eventEntry.count++;
            if (value !== undefined) {
                eventEntry.lastValue = value;
            }
        }
        else {
            // New entry
            if (value !== undefined) {
                details.set(id, { count: 1, lastValue: value });
            }
            else {
                details.set(id, { count: 1 });
            }
        }
    }
    incInfoState(id, detailId, detailValue) {
        // Increment the given ID
        const infoEntry = this.getInfoEntry(id);
        if (infoEntry) {
            // Can't use ++ here because ioBroker.StateValue isn't necessarily a number
            infoEntry.value = Number(infoEntry.value) + 1;
            // If value given and this entry has details record that
            if (infoEntry.detailsMap && detailId) {
                this.addInfoDetailsEntry(infoEntry.detailsMap, detailId, detailValue);
            }
            if (!infoEntry.timer) {
                this.setInfoStateIfChanged(id, infoEntry);
            }
        }
    }
    buildInfoDetails(src) {
        // TODO: shouldn't this use JSON.stringify?
        const out = [];
        src.forEach((value, key) => {
            if (value.lastValue !== undefined) {
                out.push({ id: key, count: value.count, lastValue: value.lastValue });
            }
            else {
                out.push({ id: key, count: value.count });
            }
        });
        return JSON.stringify(out);
    }
    setInfoStateIfChanged(id, infoEntry, shutdown = false) {
        if (infoEntry.value != infoEntry.lastSet) {
            this.log.silly('value of ' + id + ' changed to ' + infoEntry.value);
            // Store counter
            this.setState(id, infoEntry.value, true);
            infoEntry.lastSet = infoEntry.value;
            // Store any details
            if (infoEntry.detailsMap) {
                this.setState(id + 'Detail', this.buildInfoDetails(infoEntry.detailsMap), true);
            }
            if (!shutdown) {
                // Start a timer which will set the current value from the info ID map on completion
                // Obviously don't do this if called from shutdown
                this.log.silly('Starting timer for ' + id);
                infoEntry.timer = this.setTimeout((cbId, cbInfoEntry) => {
                    this.log.silly('Timeout for ' + id);
                    // Remove from timer from map as we have just finished
                    cbInfoEntry.timer = null;
                    // Update the state, but only if the value in the info ID map has changed
                    this.setInfoStateIfChanged(cbId, cbInfoEntry);
                }, 30000, // Update every 30s max TODO: make this a config parameter?
                id, infoEntry);
            }
        }
    }
    sendCommand(uuid, action) {
        this.log.debug(`Sending command ${uuid} ${action}`);
        this.incInfoState('info.messagesSent');
        this.socket.send(`jdev/sps/io/${uuid}/${action}`, 2);
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
    addStateChangeListener(id, listener, opts) {
        this.stateChangeListeners[this.namespace + '.' + id] = {
            listener,
            opts,
            queuedVal: null,
            ackTimer: null,
        };
    }
    async checkStateForAck(id) {
        const stateChangeListener = this.stateChangeListeners[id];
        if (stateChangeListener) {
            // This state change could be a result of a command we sent being ack'd
            if (stateChangeListener.ackTimer) {
                // Timer is running so clear it
                this.log.debug(`Clearing ackTimer for ${id}`);
                this.clearTimeout(stateChangeListener.ackTimer);
                stateChangeListener.ackTimer = null;
                // Send any command that may have been delayed waiting for this ack
                await this.handleDelayedStateChange(id, stateChangeListener);
            }
            else {
                this.log.debug(`No ackTimer for ${id}`);
            }
        }
        else {
            this.log.silly(`${id} has no stateChangeListener`);
        }
    }
    async setStateAck(id, value) {
        const keyId = this.namespace + '.' + id;
        this.currentStateValues[keyId] = value;
        await this.checkStateForAck(keyId);
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