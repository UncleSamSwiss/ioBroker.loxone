/* jshint -W097 */ // no "use strict" warnings
/* jshint -W061 */ // no "eval" warnings
/* jslint node: true */
"use strict";

// always required: utils
var utils = require('@iobroker/adapter-core');

// other dependencies:
var loxoneWsApi = require('node-lox-ws-api');
var colorConvert = require('color-convert');
var sprintf = require("sprintf-js").sprintf;
var extend = require('extend');

// create the adapter object
var adapter = utils.Adapter('loxone');

var existingObjects = {};
var stateChangeListeners = {};
var stateEventHandlers = {};
var operatingModes = {};
var currentStateValues = {};
var foundRooms = {};
var foundCats = {};
var client;

// unloading
adapter.on('unload', function (callback) {
    callback();
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning: state can be null if it was deleted!
    if (!id || !state || state.ack) {
        return;
    }
    
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
    if (!stateChangeListeners.hasOwnProperty(id)) {
        adapter.log.error('Unsupported state change: ' + id);
        return;
    }

    stateChangeListeners[id](currentStateValues[id], state.val);
});

// startup
adapter.on('ready', function () {
    adapter.getStates('*', function (err, states) {
        for (var id in states) {
            if (states[id] && states[id].ack) {
                currentStateValues[id] = states[id].val;
            }
        }
        
        adapter.getAdapterObjects(function (objs) {
            existingObjects = objs;
            main();
        });
    });
});

function main() {
    adapter.setState('info.connection', false, true);

    client = new loxoneWsApi(adapter.config.host + ':' + adapter.config.port, adapter.config.username, adapter.config.password, true, 'AES-256-CBC');
    client.connect();
    
    client.on('connect', function () {
        //adapter.log('Miniserver connected (' + config.host + ':' + config.port) + ')';
        adapter.log.info('Miniserver connected');
    });
    
    client.on('authorized', function () {
        adapter.log.debug('authorized');
        adapter.setState('info.connection', true, true);
    });
    
    client.on('auth_failed', function () {
        adapter.log.error('Miniserver connect failed');
    });
    
    client.on('connect_failed', function () {
        adapter.log.error('Miniserver connect failed');
    });
    
    client.on('connection_error', function (error) {
        adapter.log.error('Miniserver connection error: ' + error);
    });
    
    client.on('close', function () {
        adapter.log.info("connection closed");
        adapter.setState('info.connection', false, true);
    });
    
    client.on('send', function (message) {
        adapter.log.debug("sent message: " + message);
    });
    
    client.on('message_text', function (message) {
        adapter.log.debug('message_text ' + JSON.stringify(message));
    });
    
    client.on('message_file', function (message) {
        adapter.log.debug('message_file ' + JSON.stringify(message));
    });
    
    client.on('message_invalid', function (message) {
        adapter.log.debug('message_invalid ' + JSON.stringify(message));
    });

    client.on('keepalive', function (time) {
        adapter.log.debug('keepalive (' + time + 'ms)');
    });

    client.on('get_structure_file', function (data) {
        adapter.log.debug('get_structure_file ' + JSON.stringify(data));
        adapter.log.info("got structure file; last modified on " + data.lastModified);
        loadStructureFile(data);
    });
    
    function handleAnyEvent(uuid, evt) {
        adapter.log.debug('received update event: ' + JSON.stringify(evt) + ':' + uuid);
        handleEvent(uuid, evt);
    }
    
    client.on('update_event_value', handleAnyEvent);
    client.on('update_event_text', handleAnyEvent);
    client.on('update_event_daytimer', handleAnyEvent);
    client.on('update_event_weather', handleAnyEvent);

    adapter.subscribeStates('*');
}

function loadStructureFile(data) {
    stateEventHandlers = {};
    foundRooms = {};
    foundCats = {};
    operatingModes = data.operatingModes;
    loadGlobalStates(data.globalStates);
    loadControls(data.controls);
    loadEnums(data.rooms, 'enum.rooms', foundRooms, adapter.config.syncRooms);
    loadEnums(data.cats, 'enum.functions', foundCats, adapter.config.syncFunctions);
    loadWeatherServer(data.weatherServer);
}

function loadGlobalStates(globalStates) {
    var globalStateInfos = {
        operatingMode: {
            type: 'number',
            role: 'value',
            handler: setOperatingMode
        },
        sunrise: {
            type: 'number',
            role: 'value.interval',
            handler: setStateAck
        },
        sunset: {
            type: 'number',
            role: 'value.interval',
            handler: setStateAck
        },
        notifications: {
            type: 'number',
            role: 'value',
            handler: setStateAck
        },
        modifications: {
            type: 'number',
            role: 'value',
            handler: setStateAck
        }
    };
    var defaultInfo = {
        type: 'string',
        role: 'text',
        handler: setStateAck
    };
    
    // special case for operating mode (text)
    updateObject(
        'operatingMode-text', {
            type: 'state',
            common: {
                name: 'operatingMode: text',
                read: true,
                write: false,
                type: 'string',
                role: 'text'
            },
            native: {
                uuid: globalStates.operatingMode
            }
        });

    for (var globalStateName in globalStates) {
        var info = globalStateInfos.hasOwnProperty(globalStateName) ? globalStateInfos[globalStateName] : defaultInfo;
        updateStateObject(
            globalStateName,
            {
                name: globalStateName,
                read: true,
                write: false,
                type: info.type,
                role: info.role
            },
            globalStates[globalStateName],
            info.handler);
    }
}

function setOperatingMode(name, value) {
    setStateAck(name, value);
    setStateAck(name + '-text', operatingModes[value]);
}

function loadControls(controls) {
    var hasUnsupported = false;
    for (var uuid in controls) {
        var control = controls[uuid];
        if (!control.hasOwnProperty('type')) {
            continue;
        }
        
        try {
            eval('load' + control.type + "Control('device', uuid, control)");
            storeRoomAndCat(control, uuid);
        } catch (e) {
            adapter.log.error('Unsupported control type ' + control.type + ': ' + e);
            
            if (!hasUnsupported) {
                hasUnsupported = true;
                updateObject('Unsupported', {
                    type: 'device',
                    common: {
                        name: 'Unsupported',
                        role: 'info'
                    },
                    native: control
                });
            }
            
            updateObject('Unsupported.' + uuid, {
                type: 'state',
                common: {
                    name: control.name,
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text'
                },
                native: control
            });
        }
    }
}

function loadSubControls(parentUuid, control) {
    if (!control.hasOwnProperty('subControls')) {
        return;
    }
    for (var uuid in control.subControls) {
        var subControl = control.subControls[uuid];
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
            storeRoomAndCat(subControl, uuid);
        } catch (e) {
            adapter.log.error('Unsupported sub-control type ' + subControl.type + ': ' + e);
        }
    }
}

function storeRoomAndCat(control, uuid) {
    if (control.hasOwnProperty('room')) {
        if (!foundRooms.hasOwnProperty(control.room)) {
            foundRooms[control.room] = [];
        }
        
        foundRooms[control.room].push(uuid);
    }
    
    if (control.hasOwnProperty('cat')) {
        if (!foundCats.hasOwnProperty(control.cat)) {
            foundCats[control.cat] = [];
        }
        
        foundCats[control.cat].push(uuid);
    }
}

// this function is called if the control has no type (currently seems to be only for window monitoring)
function loadControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'info'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, []);
}

function loadAlarmControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'alarm'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['armed', 'nextLevel', 'nextLevelDelay', 'nextLevelDelayTotal', 'level', 'startTime', 'armedDelay', 'armedDelayTotal', 'sensors', 'disabledMove']);

    var levelStates = {
        '0': 'None',
        '1': 'Silent',
        '2': 'Acustic',
        '3': 'Optical',
        '4': 'Internal',
        '5': 'External',
        '6': 'Remote'
    };
    createBooleanControlStateObject(control.name, uuid, control.states, 'armed', 'switch', {write: true, smartIgnore: false});
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevel', 'number', 'value', {states: levelStates});
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevelDelay', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevelDelayTotal', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'level', 'number', 'value', {'states': levelStates});
    createSimpleControlStateObject(control.name, uuid, control.states, 'startTime', 'string', 'value.datetime');
    createSimpleControlStateObject(control.name, uuid, control.states, 'armedDelay', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'armedDelayTotal', 'number', 'value.interval');
    createListControlStateObject(control.name, uuid, control.states, 'sensors');
    createBooleanControlStateObject(control.name, uuid, control.states, 'disabledMove', 'switch', {write: true});
    
    addStateChangeListener(uuid + '.armed', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        } else {
            client.send_cmd(control.uuidAction, 'off');
        }
    });
    
    addStateChangeListener(uuid + '.disabledMove', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'dismv/0');
        } else {
            client.send_cmd(control.uuidAction, 'dismv/1');
        }
    });
    
    createButtonCommandStateObject(control.name, uuid, 'delayedOn');
    addStateChangeListener(uuid + '.delayedOn', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'delayedon/' + (newValue ? 1 : 0));
    });
    
    createButtonCommandStateObject(control.name, uuid, 'quit');
    addStateChangeListener(uuid + '.quit', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'quit');
    });

    // subControls are not needed because "sensors" already contains the information from the tracker
}

function loadAlarmClockControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'alarm' // TODO: what's the best role here? ioBroker doc is not very clear on what's an "alarm"
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['isEnabled', 'isAlarmActive', 'confirmationNeeded', 'ringingTime', 'ringDuration', 'prepareDuration', 'snoozeTime', 'snoozeDuration']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'isEnabled', 'switch', {write: true, smartIgnore: false});
    createBooleanControlStateObject(control.name, uuid, control.states, 'isAlarmActive', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'confirmationNeeded', 'indicator');
    createSimpleControlStateObject(control.name, uuid, control.states, 'ringingTime', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'ringDuration', 'number', 'value.interval', {write: true});
    createSimpleControlStateObject(control.name, uuid, control.states, 'prepareDuration', 'number', 'value.interval', {write: true});
    createSimpleControlStateObject(control.name, uuid, control.states, 'snoozeTime', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'snoozeDuration', 'number', 'value.interval', {write: true});
    
    addStateChangeListener(uuid + '.isEnabled', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'setActive/' + (newValue ? '0' : '1')); // yes, really, this is inverted!
    });
    addStateChangeListener(uuid + '.ringDuration', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'setRingDuration/' + newValue);
    });
    addStateChangeListener(uuid + '.prepareDuration', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'setPrepDuration/' + newValue);
    });
    addStateChangeListener(uuid + '.snoozeDuration', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'setSnoozeDuration/' + newValue);
    });
    
    createButtonCommandStateObject(control.name, uuid, 'snooze');
    addStateChangeListener(uuid + '.snooze', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'snooze');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'dismiss');
    addStateChangeListener(uuid + '.dismiss', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'dismiss');
    });
}

function loadAudioZoneControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'media.music'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states,
        ['serverState', 'playState', 'clientState', 'power', 'volume', 'maxVolume', 'volumeStep', 'shuffle', 'sourceList', 'repeat',
        'songName', 'duration', 'progress', 'album', 'artist', 'station', 'genre', 'cover', 'source']);
    
    var serverStates = {
        '-3': 'invalid zone',
        '-2': 'not reachable',
        '-1': 'unknown',
        '0': 'offline',
        '1': 'initializing',
        '2': 'online'
    };
    var playStates = {
        '-1': 'unknown',
        '0': 'stopped',
        '1': 'paused',
        '2': 'playing'
    };
    var clientStates = {
        '0': 'offline',
        '1': 'initializing',
        '2': 'online'
    };
    createSimpleControlStateObject(control.name, uuid, control.states, 'serverState', 'number', 'value', {'states': serverStates});
    createSimpleControlStateObject(control.name, uuid, control.states, 'playState', 'number', 'value', {write: true, states: playStates});
    createSimpleControlStateObject(control.name, uuid, control.states, 'clientState', 'number', 'value', {'states': clientStates});
    createBooleanControlStateObject(control.name, uuid, control.states, 'power', 'switch', {write: true, smartIgnore: false});
    createSimpleControlStateObject(control.name, uuid, control.states, 'volume', 'number', 'level.volume', {write: true});
    createSimpleControlStateObject(control.name, uuid, control.states, 'maxVolume', 'number', 'value');
    createBooleanControlStateObject(control.name, uuid, control.states, 'shuffle', 'switch', {write: true});
    createSimpleControlStateObject(control.name, uuid, control.states, 'sourceList', 'string', 'json');
    createSimpleControlStateObject(control.name, uuid, control.states, 'repeat', 'number', 'value', {write: true});
    createSimpleControlStateObject(control.name, uuid, control.states, 'songName', 'string', 'text');
    createSimpleControlStateObject(control.name, uuid, control.states, 'duration', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'progress', 'number', 'value.interval', {write: true});
    createSimpleControlStateObject(control.name, uuid, control.states, 'album', 'string', 'text');
    createSimpleControlStateObject(control.name, uuid, control.states, 'artist', 'string', 'text');
    createSimpleControlStateObject(control.name, uuid, control.states, 'station', 'string', 'text');
    createSimpleControlStateObject(control.name, uuid, control.states, 'genre', 'string', 'text');
    createSimpleControlStateObject(control.name, uuid, control.states, 'cover', 'string', 'text.url');
    createSimpleControlStateObject(control.name, uuid, control.states, 'source', 'number', 'value', {write: true});
    
    addStateChangeListener(uuid + '.playState', function (oldValue, newValue) {
        newValue = parseInt(newValue);
        if (newValue === 0 || newValue === 1) {
            client.send_cmd(control.uuidAction, 'pause');
        } else if (newValue === 2) {
            client.send_cmd(control.uuidAction, 'play');
        }
    });
    addStateChangeListener(uuid + '.power', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, (newValue ? 'on' : 'off'));
    });
    addStateChangeListener(uuid + '.volume', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'volume/' + newValue);
    });
    addStateChangeListener(uuid + '.shuffle', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'shuffle/' + (newValue ? 1 : 0));
    });
    addStateChangeListener(uuid + '.repeat', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'repeat/' + newValue);
    });
    addStateChangeListener(uuid + '.progress', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'progress/' + newValue);
    });
    addStateChangeListener(uuid + '.source', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'source/' + newValue);
    });
    
    createButtonCommandStateObject(control.name, uuid, 'prev');
    addStateChangeListener(uuid + '.prev', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'prev');
    });
    createButtonCommandStateObject(control.name, uuid, 'next');
    addStateChangeListener(uuid + '.next', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'next');
    });
}

function loadCentralAlarmControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'alarm'
        },
        native: control
    });
    
    createButtonCommandStateObject(control.name, uuid, 'armed', {smartIgnore: false});
    addStateChangeListener(uuid + '.armed', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, newValue ? 'on' : 'off');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'delayedOn');
    addStateChangeListener(uuid + '.delayedOn', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'delayedon');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'quit');
    addStateChangeListener(uuid + '.quit', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'quit');
    });
}

function loadCentralAudioZoneControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'media.music'
        },
        native: control
    });
    
    createButtonCommandStateObject(control.name, uuid, 'control', {smartIgnore: false});
    addStateChangeListener(uuid + '.control', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, newValue ? 'play' : 'pause');
    });
}

function loadCentralGateControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'blind'
        },
        native: control
    });
    
    createButtonCommandStateObject(control.name, uuid, 'open');
    addStateChangeListener(uuid + '.open', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'open');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'close');
    addStateChangeListener(uuid + '.close', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'close');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'stop');
    addStateChangeListener(uuid + '.stop', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'stop');
    });
}

function loadCentralJalousieControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'blind'
        },
        native: control
    });
    
    createButtonCommandStateObject(control.name, uuid, 'autoActive');
    addStateChangeListener(uuid + '.autoActive', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'auto');
        } else {
            client.send_cmd(control.uuidAction, 'NoAuto');
        }
    });
    
    createButtonCommandStateObject(control.name, uuid, 'fullUp');
    addStateChangeListener(uuid + '.fullUp', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'FullUp');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'fullDown');
    addStateChangeListener(uuid + '.fullDown', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'FullDown');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'shade');
    addStateChangeListener(uuid + '.shade', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'shade');
    });
}

function loadCentralLightControllerControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'light'
        },
        native: control
    });
    
    createButtonCommandStateObject(control.name, uuid, 'control', {smartIgnore: false});
    addStateChangeListener(uuid + '.control', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        } else {
            client.send_cmd(control.uuidAction, 'reset');
        }
    });
}

function loadColorpickerControl(type, uuid, control) {
    if (control.details.pickerType != 'Rgb') {
        throw 'Unsupported color picker type: ' + control.details.pickerType;
    }

    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'light.color.rgb'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['color', 'favorites']);
    
    loadColorPickerControlBase(uuid, control);
}

function loadColorPickerV2Control(type, uuid, control) {
    if (control.details.pickerType != 'Rgb') {
        throw 'Unsupported color picker type: ' + control.details.pickerType;
    }

    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'light.color.rgb'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['color', 'sequence', 'sequenceColorIdx']);
    
    loadColorPickerControlBase(uuid, control);
}

function loadColorPickerControlBase(uuid, control) {
    if (!control.states || !control.states.hasOwnProperty('color')) {
        return;
    }
    
    updateStateObject(
        uuid + '.red',
        {
            name: control.name + ': red',
            read: true,
            write: true,
            type: 'number',
            role: 'level.color.red',
            min: 0,
            max: 255,
            smartIgnore: true
        },
        control.states.color,
        function (name, value) {
            var rgb = loxoneColorToRgb(value);
            if (rgb !== undefined) {
                setStateAck(uuid + '.red', rgb[0]);
            }
        });
    updateStateObject(
        uuid + '.green',
        {
            name: control.name + ': green',
            read: true,
            write: true,
            type: 'number',
            role: 'level.color.green',
            min: 0,
            max: 255,
            smartIgnore: true
        },
        control.states.color,
        function (name, value) {
            var rgb = loxoneColorToRgb(value);
            if (rgb !== undefined) {
                setStateAck(uuid + '.green', rgb[1]);
            }
        });
    updateStateObject(
        uuid + '.blue',
        {
            name: control.name + ': blue',
            read: true,
            write: true,
            type: 'number',
            role: 'level.color.blue',
            min: 0,
            max: 255,
            smartIgnore: true
        },
        control.states.color,
        function (name, value) {
            var rgb = loxoneColorToRgb(value);
            if (rgb !== undefined) {
                setStateAck(uuid + '.blue', rgb[2]);
            }
        });
    updateStateObject(
        uuid + '.rgb',
        {
            name: control.name + ': RGB',
            read: true,
            write: false,
            type: 'string',
            role: 'level.color.rgb',
            smartIgnore: true
        },
        control.states.color,
        function (name, value) {
            var rgb = loxoneColorToRgb(value);
            if (rgb !== undefined) {
                setStateAck(uuid + '.rgb', rgb[0] + ',' + rgb[1] + ',' + rgb[2]);
            }
        });
        
    // we use a timer (100 ms) to update the three color values,
    // so if somebody sends us the three values (almost) at once,
    // we don't change the color three times using commands
    var colorUpdateTimer = null;
    var parentId = adapter.namespace + '.' + uuid;
    var updateColorValue = function () {
        adapter.getStates(uuid + '.*', function (err, states) {
            var red = parseInt(states[parentId + '.red'].val);
            var green = parseInt(states[parentId + '.green'].val);
            var blue = parseInt(states[parentId + '.blue'].val);
            
            var hsl = colorConvert.rgb.hsv(red, green, blue);
            var command = sprintf('hsv(%d,%d,%d)', hsl[0], hsl[1], hsl[2]);
            client.send_cmd(control.uuidAction, command);
        });
    };
    var startUpdateTimer = function (oldValue, newValue) {
        if (colorUpdateTimer) {
            clearTimeout(colorUpdateTimer);
        }
        colorUpdateTimer = setTimeout(updateColorValue, 100);
    };
    addStateChangeListener(uuid + '.red', startUpdateTimer);
    addStateChangeListener(uuid + '.green', startUpdateTimer);
    addStateChangeListener(uuid + '.blue', startUpdateTimer);
}

function loadDimmerControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'light'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['position', 'min', 'max', 'step']);
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'position', 'number', 'level.dimmer', {write: true});
    createSimpleControlStateObject(control.name, uuid, control.states, 'min', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'max', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'step', 'number', 'value');
    
    addStateChangeListener(uuid + '.position', function (oldValue, newValue) {
        newValue = parseInt(newValue);
        client.send_cmd(control.uuidAction, newValue.toString());
    });

    createButtonCommandStateObject(control.name, uuid, 'on');
    addStateChangeListener(uuid + '.on', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'on');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'off');
    addStateChangeListener(uuid + '.off', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'off');
    });
}

function loadGateControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'blind'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['position', 'active', 'preventOpen', 'preventClose']);
    
    var activeStates = {
        '-1': 'close',
        '0': 'not moving',
        '1': 'open'
    };
    createPercentageControlStateObject(control.name, uuid, control.states, 'position', 'level', {write: true, smartIgnore: false});
    createSimpleControlStateObject(control.name, uuid, control.states, 'active', 'number', 'value', {write: true, states: activeStates});
    createBooleanControlStateObject(control.name, uuid, control.states, 'preventOpen', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'preventClose', 'indicator');
    
    addStateChangeListener(uuid + '.active', function (oldValue, newValue) {
        oldValue = parseInt(oldValue);
        newValue = parseInt(newValue);
        if (newValue === oldValue) {
            return;
        } else if (newValue === 1) {
            if (oldValue === -1) {
                // open twice because we are currently closing
                client.send_cmd(control.uuidAction, 'open');
            }
            client.send_cmd(control.uuidAction, 'open');
        } else if (newValue === -1) {
            if (oldValue === 1) {
                // close twice because we are currently opening
                client.send_cmd(control.uuidAction, 'close');
            }
            client.send_cmd(control.uuidAction, 'close');
        } else if (newValue === 0) {
            if (oldValue === 1) {
                client.send_cmd(control.uuidAction, 'close');
            } else if (oldValue === -1) {
                client.send_cmd(control.uuidAction, 'open');
            }
        }
    });
    
    // for Alexa support:
    if (control.states.position) {
        addStateChangeListener(
            uuid + '.position',
            function (oldValue, newValue) {
                newValue = Math.max(0, Math.min(100, newValue)); // 0 <= newValue <= 100
                if (oldValue == newValue) {
                    return;
                }
                
                var targetValue;
                if (oldValue < newValue) {
                    targetValue = (newValue - 1) / 100;
                    client.send_cmd(control.uuidAction, 'open');
                } else {
                    targetValue = (newValue + 1) / 100;
                    client.send_cmd(control.uuidAction, 'close');
                }
                
                if (newValue == 100 || newValue === 0) {
                    return;
                }
                
                var listenerName = 'auto';
                addStateEventHandler(
                    control.states.position,
                    function (value) {
                        if (oldValue < newValue && value >= targetValue) {
                            removeStateEventHandler(control.states.position, listenerName);
                            client.send_cmd(control.uuidAction, 'close');
                        } else if (oldValue > newValue && value <= targetValue) {
                            removeStateEventHandler(control.states.position, listenerName);
                            client.send_cmd(control.uuidAction, 'open');
                        }
                    },
                    listenerName);
            });
    }
}

function loadInfoOnlyDigitalControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'switch'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['active']);

    if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('active')) {
        return;
    }
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'active', 'indicator');
    
    if (!control.hasOwnProperty('details')) {
        return;
    }
    
    if (control.details.hasOwnProperty('text')) {
        updateStateObject(
            uuid + '.active-text',
            {
                name: control.name + ': active as text',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                smartIgnore: true
            },
            control.states.active,
            function (name, value) {
                setStateAck(name, value == 1 ? control.details.text.on : control.details.text.off);
            });
    }
    
    if (control.details.hasOwnProperty('image')) {
        updateStateObject(
            uuid + '.active-image',
            {
                name: control.name + ': active as image',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                smartIgnore: true
            },
            control.states.active,
            function (name, value) {
                setStateAck(name, value == 1 ? control.details.image.on : control.details.image.off);
            });
    }
    
    if (control.details.hasOwnProperty('color')) {
        updateStateObject(
            uuid + '.active-color',
            {
                name: control.name + ': active as color',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                smartIgnore: true
            },
            control.states.active,
            function (name, value) {
                setStateAck(name, value == 1 ? control.details.color.on : control.details.color.off);
            });
    }
}

function loadInfoOnlyAnalogControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'sensor'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['value']);
    
    if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('value')) {
        return;
    }
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'value', 'number', 'value');
    
    if (!control.hasOwnProperty('details')) {
        return;
    }
    
    if (control.details.hasOwnProperty('format')) {
        updateStateObject(
            uuid + '.value-formatted',
            {
                name: control.name + ': formatted value',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                smartIgnore: true
            },
            control.states.value,
            function (name, value) {
                setFormattedStateAck(name, value, control.details.format);
            });
    }
}

function loadIntercomControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'info'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['bell', 'lastBellEvents', 'version']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'bell', 'indicator');
    createListControlStateObject(control.name, uuid, control.states, 'lastBellEvents');
    createSimpleControlStateObject(control.name, uuid, control.states, 'version', 'string', 'text');
    
    createButtonCommandStateObject(control.name, uuid, 'answer');
    addStateChangeListener(uuid + '.answer', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'answer');
    });

    loadSubControls(uuid, control);
}

function loadJalousieControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'blind'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['up', 'down', 'position', 'shadePosition', 'safetyActive', 'autoAllowed', 'autoActive', 'locked']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'up', 'indicator', {write: true});
    createBooleanControlStateObject(control.name, uuid, control.states, 'down', 'indicator', {write: true});
    createPercentageControlStateObject(control.name, uuid, control.states, 'position', 'level.blind', {write: true, smartIgnore: false});
    createPercentageControlStateObject(control.name, uuid, control.states, 'shadePosition', 'level');
    createBooleanControlStateObject(control.name, uuid, control.states, 'safetyActive', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'autoAllowed', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'autoActive', 'indicator', {write: true});
    createBooleanControlStateObject(control.name, uuid, control.states, 'locked', 'indicator');
    createSimpleControlStateObject(control.name, uuid, control.states, 'infoText', 'string', 'text');
    
    
    addStateChangeListener(uuid + '.up', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'up');
        } else {
            client.send_cmd(control.uuidAction, 'UpOff');
        }
    });
    addStateChangeListener(uuid + '.down', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'down');
        } else {
            client.send_cmd(control.uuidAction, 'DownOff');
        }
    });
    addStateChangeListener(uuid + '.autoActive', function (oldValue, newValue) {
        if (newValue == oldValue) {
            return;
        } else if (newValue) {
            client.send_cmd(control.uuidAction, 'auto');
        } else {
            client.send_cmd(control.uuidAction, 'NoAuto');
        }
    });
    
    // for Alexa support:
    if (control.states.position) {
        addStateChangeListener(
            uuid + '.position',
            function (oldValue, newValue) {
                newValue = Math.max(0, Math.min(100, newValue)); // 0 <= newValue <= 100
                if (oldValue == newValue) {
                    return;
                }
                
                if (newValue == 100) {
                    client.send_cmd(control.uuidAction, 'FullDown');
                    return;
                }
                if (newValue === 0) {
                    client.send_cmd(control.uuidAction, 'FullUp');
                    return;
                }
                var targetValue;
                if (oldValue < newValue) {
                    targetValue = (newValue - 5) / 100;
                    client.send_cmd(control.uuidAction, 'down');
                } else {
                    targetValue = (newValue + 5) / 100;
                    client.send_cmd(control.uuidAction, 'up');
                }
                var listenerName = 'auto';
                addStateEventHandler(
                    control.states.position,
                    function (value) {
                        if (oldValue < newValue && value >= targetValue) {
                            removeStateEventHandler(control.states.position, listenerName);
                            client.send_cmd(control.uuidAction, 'DownOff');
                        } else if (oldValue > newValue && value <= targetValue) {
                            removeStateEventHandler(control.states.position, listenerName);
                            client.send_cmd(control.uuidAction, 'UpOff');
                        }
                    },
                    listenerName);
           });
    }
    
    createButtonCommandStateObject(control.name, uuid, 'fullUp');
    addStateChangeListener(uuid + '.fullUp', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'FullUp');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'fullDown');
    addStateChangeListener(uuid + '.fullDown', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'FullDown');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'shade');
    addStateChangeListener(uuid + '.shade', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'shade');
    });
}

function loadLightControllerControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'light'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['activeScene', 'sceneList']);

    createSimpleControlStateObject(control.name, uuid, control.states, 'activeScene', 'number', 'level', {write: true});
    addStateChangeListener(uuid + '.activeScene', function (oldValue, newValue) {
        newValue = parseInt(newValue);
        if (newValue === 9) {
            client.send_cmd(control.uuidAction, 'on');
        } else {
            client.send_cmd(control.uuidAction, newValue.toString());
        }
    });
    
    if (control.states.hasOwnProperty('sceneList')) {
        updateStateObject(
            uuid + '.sceneList',
            {
                name: control.name + ': sceneList',
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                smartIgnore: true
            },
            control.states.sceneList,
            function (name, value) {
                // weird documentation: they say it's 'text' within the struct, but I get the value directly; let's support both
                if (value.hasOwnProperty('text')) {
                    setStateAck(name, value.text.split(','));
                } else {
                    setStateAck(name, value.toString().split(','));
                }
            });
    }
    
    createButtonCommandStateObject(control.name, uuid, 'plus');
    addStateChangeListener(uuid + '.plus', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'plus');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'minus');
    addStateChangeListener(uuid + '.minus', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'minus');
    });
    
    // for Alexa support:
    createButtonCommandStateObject(control.name, uuid, 'control', {smartIgnore: false});
    addStateChangeListener(uuid + '.control', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        } else {
            client.send_cmd(control.uuidAction, '0');
        }
    });

    // TODO: currently we don't support scene modifications ("learn" and "delete" commands),
    // IMHO this should be done using the Loxone Web interface

    loadSubControls(uuid, control);
}

function loadLightControllerV2Control(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'light'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['activeMoods', 'moodList', 'favoriteMoods', 'additionalMoods']);
    
    if (control.states.hasOwnProperty('activeMoods') && control.states.hasOwnProperty('moodList') &&
        control.states.hasOwnProperty('favoriteMoods') && control.states.hasOwnProperty('additionalMoods')) {
        var idToMoodName = {};
        var moodNameToId = {};
        var activeMoods = [];
        var favoriteMoods = [];
        var additionalMoods = [];
        var updateMoodsList = function (name, idList) {
            if (Object.keys(idToMoodName).length === 0) {
                return;
            }
            var list = [];
            for (var index in idList) {
                var id = idList[index];
                if (idToMoodName.hasOwnProperty(id)) {
                    list.push(idToMoodName[id]);
                } else {
                    list.push(id);
                }
            }
            
            setStateAck(uuid + '.' + name, list);
        };
        var updateActiveMoods = function () {
            updateMoodsList('activeMoods', activeMoods);
        };
        var updateFavoriteMoods = function () {
            updateMoodsList('favoriteMoods', favoriteMoods);
        };
        var updateAdditionalMoods = function () {
            updateMoodsList('additionalMoods', additionalMoods);
        };
        updateStateObject(
            uuid + '.moodList',
            {
                name: control.name + ': moodList',
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                smartIgnore: true
            },
            control.states.moodList,
            function (name, value) {
                var moodList = JSON.parse(value);
                var list = [];
                idToMoodName = {};
                moodNameToId = {};
                for (var index in moodList) {
                    var mood = moodList[index];
                    if (mood.hasOwnProperty('id') && mood.hasOwnProperty('name')) {
                        idToMoodName[mood.id] = mood.name;
                        moodNameToId[mood.name] = mood.id;
                        list.push(mood.name);
                    }
                }
                updateActiveMoods();
                updateFavoriteMoods();
                updateAdditionalMoods();

                setStateAck(name, list);
            });
        updateStateObject(
            uuid + '.activeMoods',
            {
                name: control.name + ': activeMoods',
                read: true,
                write: true,
                type: 'array',
                role: 'list',
                smartIgnore: true
            },
            control.states.activeMoods,
            function (name, value) {
                activeMoods = JSON.parse(value);
                updateActiveMoods();
            });
        addStateChangeListener(uuid + '.activeMoods', function (oldValue, newValue) {
            if (!Array.isArray(newValue)) {
                try {
                    newValue = JSON.parse(newValue);
                } catch (e) {
                    // ignore error, continue below
                }
                if (!Array.isArray(newValue)) {
                    newValue = newValue.split(',');
                }
            }
            
            var ids = [];
            for (var i = 0; i < newValue.length; i++) {
                var moodName = newValue[i];
                if (!moodNameToId.hasOwnProperty(moodName)) {
                    return;
                }
                ids.push(moodNameToId[moodName]);
            }
            if (ids.length === 0) {
                adapter.log.error(uuid + ".activeMoods can't have zero IDs, discarding new value");
                return;
            }
            
            var addMoods = [];
            var removeMoods = [];
            var hasKeepMoods = false;
            for (i = 0; i < ids.length; i++) {
                if (activeMoods.includes(ids[i])) {
                    hasKeepMoods = true;
                } else {
                    addMoods.push(ids[i]);
                }
            }
            for (i = 0; i < activeMoods.length; i++) {
                if (!ids.includes(activeMoods[i])) {
                    removeMoods.push(activeMoods[i]);
                }
            }
            if (hasKeepMoods) {
                for (i = 0; i < removeMoods.length; i++) {
                    client.send_cmd(control.uuidAction, 'removeMood/' + removeMoods[i]);
                }
            } else {
                var firstId = addMoods.shift();
                client.send_cmd(control.uuidAction, 'changeTo/' + firstId);
            }
            
            for (i = 0; i < addMoods.length; i++) {
                client.send_cmd(control.uuidAction, 'addMood/' + addMoods[i]);
            }
        });
        updateStateObject(
            uuid + '.favoriteMoods',
            {
                name: control.name + ': favoriteMoods',
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                smartIgnore: true
            },
            control.states.favoriteMoods,
            function (name, value) {
                favoriteMoods = JSON.parse(value);
                updateFavoriteMoods();
            });
        updateStateObject(
            uuid + '.additionalMoods',
            {
                name: control.name + ': additionalMoods',
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                smartIgnore: true
            },
            control.states.additionalMoods,
            function (name, value) {
                additionalMoods = JSON.parse(value);
                updateAdditionalMoods();
            });
    }
    
    createButtonCommandStateObject(control.name, uuid, 'plus');
    addStateChangeListener(uuid + '.plus', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'plus');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'minus');
    addStateChangeListener(uuid + '.minus', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'minus');
    });
    
    // TODO: add Alexa support! (how???)
    
    // TODO: currently we don't support scene modifications ("learn" and "delete" commands),
    // IMHO this should be done using the Loxone Web interface
    
    loadSubControls(uuid, control);
}

function loadMeterControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'sensor'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['actual', 'total']);
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'actual', 'number', 'value.power.consumption');
    createSimpleControlStateObject(control.name, uuid, control.states, 'total', 'number', 'value.power.consumption');
    
    createButtonCommandStateObject(control.name, uuid, 'reset');
    addStateChangeListener(uuid + '.reset', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'reset');
    });
    
    if (!control.hasOwnProperty('details')) {
        return;
    }
    
    if (control.details.hasOwnProperty('actualFormat')) {
        updateStateObject(
            uuid + '.actual-formatted',
            {
                name: control.name + ': formatted actual value',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                smartIgnore: true
            },
            control.states.actual,
            function (name, value) {
                setFormattedStateAck(name, value, control.details.actualFormat);
            });
    }
    
    if (control.details.hasOwnProperty('totalFormat')) {
        updateStateObject(
            uuid + '.total-formatted',
            {
                name: control.name + ': formatted total value',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                smartIgnore: true
            },
            control.states.total,
            function (name, value) {
                setFormattedStateAck(name, value, control.details.totalFormat);
            });
    }
}

function loadPushbuttonControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'switch'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['active']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'active', 'switch', {write: true, smartIgnore: type == 'channel'});

    addStateChangeListener(uuid + '.active', function (oldValue, newValue) {
        if (newValue == oldValue) {
            return;
        } else if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        } else {
            client.send_cmd(control.uuidAction, 'off');
        }
    });
    
    createButtonCommandStateObject(control.name, uuid, 'pulse');
    addStateChangeListener(uuid + '.pulse', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'pulse');
    });
}

function loadSliderControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'sensor'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['value', 'error']);
    
    var common = {write: true};
    if (control.hasOwnProperty('details')) {
        common.min = control.details.min;
        common.max = control.details.max;
    }
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'value', 'number', 'level', common);
    addStateChangeListener(uuid + '.value', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, newValue);
    });
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'error', 'indicator.maintenance');
    
    if (!control.hasOwnProperty('details')) {
        return;
    }
    
    if (control.details.hasOwnProperty('format')) {
        updateStateObject(
            uuid + '.value-formatted',
            {
                name: control.name + ': formatted value',
                read: true,
                write: false,
                type: 'string',
                role: 'text',
                smartIgnore: true
            },
            control.states.value,
            function (name, value) {
                setFormattedStateAck(name, value, control.details.format);
            });
    }
    
}

function loadSmokeAlarmControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'alarm'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['nextLevel', 'nextLevelDelay', 'nextLevelDelayTotal', 'level', 'sensors', 'acousticAlarm', 'testAlarm', 'alarmCause', 'startTime', 'timeServiceMode']);
    
    var levelStates = {
        '0': 'None',
        '1': 'Silent',
        '2': 'Acustic',
        '3': 'Optical',
        '4': 'Internal',
        '5': 'External',
        '6': 'Remote'
    };
    var causeStates = {
        '0': 'None',
        '1': 'Smoke',
        '2': 'Water',
        '3': 'Smoke & Water',
        '4': 'Temperature',
        '5': 'Temperature & Smoke',
        '6': 'Temperature & Water',
        '7': 'Temperature & Smoke & Water',
        '8': 'Arc Fault',
        '9': 'Arc Fault & Smoke',
        '10': 'Arc Fault & Water',
        '11': 'Arc Fault & Smoke & Water',
        '12': 'Arc Fault & Temperature',
        '13': 'Arc Fault & Temperature & Smoke',
        '14': 'Arc Fault & Temperature & Water',
        '15': 'Arc Fault & Temperature & Smoke & Water'
    };
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevel', 'number', 'value', {states: levelStates});
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevelDelay', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevelDelayTotal', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'level', 'number', 'value', {states: levelStates});
    createListControlStateObject(control.name, uuid, control.states, 'sensors');
    createBooleanControlStateObject(control.name, uuid, control.states, 'acousticAlarm', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'testAlarm', 'indicator');
    createSimpleControlStateObject(control.name, uuid, control.states, 'alarmCause', 'number', 'value', {states: causeStates});
    createSimpleControlStateObject(control.name, uuid, control.states, 'startTime', 'string', 'value.datetime');
    createSimpleControlStateObject(control.name, uuid, control.states, 'timeServiceMode', 'number', 'level.interval', {write: true});
    
    createButtonCommandStateObject(control.name, uuid, 'mute');
    addStateChangeListener(uuid + '.mute', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'mute');
    });
    
    createButtonCommandStateObject(control.name, uuid, 'quit');
    addStateChangeListener(uuid + '.quit', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'quit');
    });
    
    addStateChangeListener(uuid + '.timeServiceMode', function (oldValue, newValue) {
        newValue = parseInt(newValue);
        if (newValue === undefined || newValue < 0) {
            return;
        }
        
        client.send_cmd(control.uuidAction, 'servicemode/' + newValue);
    });
    
    // subControls are not needed because "sensors" already contains the information from the tracker
}

function loadSwitchControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'switch'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['active']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'active', 'switch', {write: true, smartIgnore: type == 'channel'});
    
    addStateChangeListener(uuid + '.active', function (oldValue, newValue) {
        if (newValue == oldValue) {
            return;
        } else if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        } else {
            client.send_cmd(control.uuidAction, 'off');
        }
    });
}

function loadTimedSwitchControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'switch'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['deactivationDelayTotal', 'deactivationDelay']);
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'deactivationDelayTotal', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'deactivationDelay', 'number', 'value.interval');
    
    createButtonCommandStateObject(control.name, uuid, 'active', {smartIgnore: type == 'channel'});
    addStateChangeListener(uuid + '.active', function (oldValue, newValue) {
        if (newValue == oldValue) {
            return;
        } else if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        } else {
            client.send_cmd(control.uuidAction, 'off');
        }
    });
    
    createButtonCommandStateObject(control.name, uuid, 'pulse');
    addStateChangeListener(uuid + '.pulse', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'pulse');
    });
}

function loadTrackerControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'info'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['entries']);
    
    createListControlStateObject(control.name, uuid, control.states, 'entries');
}

function loadWindowMonitorControl(type, uuid, control) {
    updateObject(uuid, {
        type: type,
        common: {
            name: control.name,
            role: 'sensor'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['windowStates', 'numOpen', 'numClosed', 'numTilted', 'numOffline', 'numLocked', 'numUnlocked']);
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'numOpen', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'numClosed', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'numTilted', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'numOffline', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'numLocked', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'numUnlocked', 'number', 'value');
    
    if (!control.hasOwnProperty('details') || !control.details.hasOwnProperty('windows') || !control.states.hasOwnProperty('windowStates')) {
        return;
    }
    var windowPositions = {1: 'closed', 2: 'tilted', 4: 'open', 8: 'locked', 16: 'unlocked'};
    for (var index in control.details.windows) {
        var window = control.details.windows[index];
        var id = uuid + '.' + (parseInt(index) + 1);
        updateObject(id, {
            type: 'channel',
            common: {
                name: control.name + ': ' + window.name,
                role: 'sensor.window.3',
                smartIgnore: true
            },
            native: window
        });
        for (var mask in windowPositions) {
            var windowPosition = windowPositions[mask];
            var obj = {
                type: 'state',
                common: {
                    name: control.name + ': ' + window.name + ': ' + windowPosition,
                    read: true,
                    write: false,
                    type: 'boolean',
                    role: 'indicator',
                    smartIgnore: true
                },
                native: {}
            };
            updateObject(id + '.' + windowPosition, obj);
        }
    }

    addStateEventHandler(control.states.windowStates, function (value) {
        var values = value.split(',');
        for (var index in values) {
            for (var mask in windowPositions) {
                var windowPosition = windowPositions[mask];
                setStateAck(uuid + '.' + (parseInt(index) + 1) + '.' + windowPosition, (values[index] & mask) == mask);
            }
        }
    });
}

function loadOtherControlStates(controlName, uuid, states, skipKeys) {
    if (states === undefined) {
        return;
    }

    for (var stateName in states) {
        if (skipKeys.indexOf(stateName) !== -1) {
            continue;
        }
        
        createSimpleControlStateObject(controlName, uuid, states, stateName, 'string', 'text');
    }
}

function loadEnums(values, enumName, found, enabled) {
    if (!enabled) {
        return;
    }

    for (var uuid in values) {
        if (!found.hasOwnProperty(uuid)) {
            // don't sync room/cat if we have no control that is using it
            continue;
        }
        
        var members = [];
        for (var i in found[uuid]) {
            members.push(adapter.namespace + '.' + found[uuid][i]);
        }
        
        var item = values[uuid];
        var obj = {
            type: 'enum',
            common: {
                name: item.name,
                members: members
            },
            native: item
        };
        
        updateEnumObject(enumName + '.' + item.name, obj);
    }
}

function updateEnumObject(id, newObj) {
    // similar to hm-rega.js:
    adapter.getForeignObject(id, function (err, obj) {
        var changed = false;
        if (!obj) {
            obj = newObj;
            changed = true;
        } else {
            obj.common = obj.common || {};
            obj.common.members = obj.common.members || [];
            for (var m = 0; m < newObj.common.members.length; m++) {
                if (obj.common.members.indexOf(newObj.common.members[m]) === -1) {
                    changed = true;
                    obj.common.members.push(newObj.common.members[m]);
                }
            }
        }
        if (changed) {
            adapter.setForeignObject(id, obj);
        }
    });
}

function loadWeatherServer(data) {
    if (data === undefined || !data.hasOwnProperty('states') || !data.states.hasOwnProperty('actual')) {
        return;
    }
    
    var deviceName = 'WeatherServer';
    updateObject(deviceName, {
        type: 'device',
        common: {
            name: deviceName,
            role: 'weather'
        },
        native: data
    });
    
    var setWeatherObject = function (channelName, id, name, type, role) {
        updateObject(deviceName + '.' + channelName + '.' + id, {
            type: 'state',
            common: {
                name: name,
                read: true,
                write: false,
                type: type,
                role: role
            },
            native: {}
        });
    };
    
    var setWeatherObjects = function (channelName) {
        updateObject(deviceName + '.' + channelName, {
            type: 'channel',
            common: {
                name: channelName,
                role: 'weather.current'
            },
            native: {}
        });

        setWeatherObject(channelName, 'barometricPressure', channelName + ': Barometric pressure', 'number', 'value');
        setWeatherObject(channelName, 'barometricPressure-formatted', channelName + ': Barometric pressure: formatted', 'string', 'text');
        setWeatherObject(channelName, 'dewPoint', channelName + ': Dew point', 'number', 'value.temperature');
        setWeatherObject(channelName, 'dewPoint-formatted', channelName + ': Dew point: formatted', 'string', 'text');
        setWeatherObject(channelName, 'perceivedTemperature', channelName + ': Perceived temperature', 'number', 'value.temperature');
        setWeatherObject(channelName, 'perceivedTemperature-formatted', channelName + ': Perceived temperature: formatted', 'string', 'text');
        setWeatherObject(channelName, 'precipitation', channelName + ': Precipitation', 'number', 'value');
        setWeatherObject(channelName, 'precipitation-formatted', channelName + ': Precipitation: formatted', 'string', 'text');
        setWeatherObject(channelName, 'relativeHumidity', channelName + ': Relative humidity', 'number', 'value.humidity');
        setWeatherObject(channelName, 'relativeHumidity-formatted', channelName + ': Relative humidity: formatted', 'string', 'text');
        setWeatherObject(channelName, 'solarRadiation', channelName + ': Solar radiation', 'number', 'value');
        setWeatherObject(channelName, 'temperature', channelName + ': Temperature', 'number', 'value.temperature');
        setWeatherObject(channelName, 'temperature-formatted', channelName + ': Temperature: formatted', 'string', 'text');
        setWeatherObject(channelName, 'timestamp', channelName + ': Timestamp', 'number', 'value.time');
        setWeatherObject(channelName, 'weatherType', channelName + ': Weather type', 'number', 'value');
        setWeatherObject(channelName, 'weatherType-text', channelName + ': Weather type: text', 'string', 'text');
        setWeatherObject(channelName, 'windDirection', channelName + ': Wind direction', 'number', 'value');
        setWeatherObject(channelName, 'windSpeed', channelName + ': Wind speed', 'number', 'value');
        setWeatherObject(channelName, 'windSpeed-formatted', channelName + ': Wind speed: formatted', 'string', 'text');
    };
    
    var setWeatherStates = function (parent, values) {
        if (values === undefined) {
            return;
        }
        
        setStateAck(parent + '.barometricPressure', values.barometricPressure);
        setFormattedStateAck(parent + '.barometricPressure-formatted', values.barometricPressure, data.format.barometricPressure);
        setStateAck(parent + '.dewPoint', values.dewPoint);
        setFormattedStateAck(parent + '.dewPoint-formatted', values.dewPoint, data.format.temperature);
        setStateAck(parent + '.perceivedTemperature', values.perceivedTemperature);
        setFormattedStateAck(parent + '.perceivedTemperature-formatted', values.perceivedTemperature, data.format.temperature);
        setStateAck(parent + '.precipitation', values.precipitation);
        setFormattedStateAck(parent + '.precipitation-formatted', values.precipitation, data.format.precipitation);
        setStateAck(parent + '.relativeHumidity', values.relativeHumidity);
        setFormattedStateAck(parent + '.relativeHumidity-formatted', values.relativeHumidity, data.format.relativeHumidity);
        setStateAck(parent + '.solarRadiation', values.solarRadiation);
        setStateAck(parent + '.temperature', values.temperature);
        setFormattedStateAck(parent + '.temperature-formatted', values.temperature, data.format.temperature);
        setTimeStateAck(parent + '.timestamp', values.timestamp);
        setStateAck(parent + '.weatherType', values.weatherType);
        setStateAck(parent + '.weatherType-text', data.weatherTypeTexts[values.weatherType]);
        setStateAck(parent + '.windDirection', values.windDirection);
        setStateAck(parent + '.windSpeed', values.windSpeed);
        setFormattedStateAck(parent + '.windSpeed-formatted', values.windSpeed, data.format.windSpeed);
    };
    
    setWeatherObjects('Actual');

    addStateEventHandler(data.states.actual, function (evt) {
        setWeatherStates(deviceName + '.Actual', evt.entry[0]);
    });
    
    var forecastChannelsCount = 0;
    addStateEventHandler(data.states.forecast, function (evt) {
        for (var i = 0; i < evt.entry.length; i++) {
            var channelName = 'Hour' + sprintf("%02d", i + 1);
            if (i >= forecastChannelsCount) {
                setWeatherObjects(channelName);
                forecastChannelsCount++;
            }
            
            setWeatherStates(deviceName + '.' + channelName, evt.entry[i]);
        }
    });
}

function createSimpleControlStateObject(controlName, uuid, states, name, type, role, commonExt) {
    if (states !== undefined && states.hasOwnProperty(name)) {
        var common = {
            name: controlName + ': ' + name,
            read: true,
            write: false,
            type: type,
            role: role,
            smartIgnore: true
        };
        if (commonExt && typeof commonExt === 'object') {
            extend(true, common, commonExt);
        }
        updateStateObject(
            uuid + '.' + normalizeName(name),
            common,
            states[name],
            setStateAck);
    }
}

function createBooleanControlStateObject(controlName, uuid, states, name, role, commonExt) {
    if (states !== undefined && states.hasOwnProperty(name)) {
        var common = {
            name: controlName + ': ' + name,
            read: true,
            write: false,
            type: 'boolean',
            role: role,
            smartIgnore: true
        };
        if (commonExt && typeof commonExt === 'object') {
            extend(true, common, commonExt);
        }
        updateStateObject(
            uuid + '.' + normalizeName(name),
            common,
            states[name],
            function (name, value) {
                setStateAck(name, value == 1);
            });
    }
}

function createPercentageControlStateObject(controlName, uuid, states, name, role, commonExt) {
    if (states !== undefined && states.hasOwnProperty(name)) {
        var common = {
            name: controlName + ': ' + name,
            read: true,
            write: false,
            type: 'number',
            role: role,
            unit: '%',
            smartIgnore: true
        };
        if (commonExt && typeof commonExt === 'object') {
            extend(true, common, commonExt);
        }
        updateStateObject(
            uuid + '.' + normalizeName(name),
            common,
            states[name],
            function (name, value) {
                setStateAck(name, Math.round(value * 100));
            });
    }
}

function createListControlStateObject(controlName, uuid, states, name) {
    if (states !== undefined && states.hasOwnProperty(name)) {
        updateStateObject(
            uuid + '.' + normalizeName(name),
            {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                smartIgnore: true
            },
            states[name],
            function (name, value) {
                setStateAck(name, value.toString().split('|'));
            });
    }
}

function createButtonCommandStateObject(controlName, uuid, name, commonExt) {
    var common = {
        name: controlName + ': ' + name,
        read: false,
        write: true,
        type: 'boolean',
        role: 'button',
        smartIgnore: true
    };
    if (commonExt && typeof commonExt === 'object') {
        extend(true, common, commonExt);
    }
    updateStateObject(uuid + '.' + normalizeName(name), common, uuid);
}

function normalizeName(name) {
    return name.trim().replace(/[^\wäöüÄÖÜäöüéàèêçß]+/g, '_');
}

function loxoneColorToRgb(value) {
    value = value.toString();
    var match = value.match(/hsv\((\d+),(\d+),(\d+)\)/i);
    if (match) {
        var hue = parseInt(match[1]);
        var sat = parseInt(match[2]);
        var val = parseInt(match[3]);
        
        return colorConvert.hsv.rgb(hue, sat, val);
    }
    
    match = value.match(/temp\((\d+),(\d+)\)/i);
    if (match) {
        var brightness = parseFloat(match[1]) / 100;
        var temperature = parseFloat(match[2]) / 100;
        
        // based on http://www.tannerhelland.com/4435/convert-temperature-rgb-algorithm-code/
        var red = 255;
        var green = 255;
        var blue = 255;

        if (temperature <= 66) {
            green = (99.4708025861 * Math.log(temperature)) - 161.1195681661;
            if (temperature <= 19) {
                blue = 0;
            } else {
                blue = (138.5177312231 * Math.log(temperature - 10)) - 305.0447927307;
            }
        } else {
            red = 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
            green = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
        }
        
        red = Math.min(Math.max(red, 0), 255);
        green = Math.min(Math.max(green, 0), 255);
        blue = Math.min(Math.max(blue, 0), 255);
        
        return [Math.round(red), Math.round(green), Math.round(blue)];
    }

    return undefined;
}

function updateObject(id, obj) {
    var fullId = adapter.namespace + '.' + id;
    if (existingObjects.hasOwnProperty(fullId)) {
        var existingObject = existingObjects[fullId];
        if (!adapter.config.syncNames) {
            obj.common.name = existingObject.common.name;
        }
        if (obj.common.smartName != 'ignore' && existingObject.common.smartName != 'ignore') {
            // keep the smartName (if it's not supposed to be ignored)
            obj.common.smartName = existingObject.common.smartName;
        }
    }
    
    adapter.extendObject(id, obj);
}

function updateStateObject(id, commonInfo, stateUuid, stateEventHandler) {
    if (commonInfo.hasOwnProperty('smartIgnore')) {
        // interpret smartIgnore (our own extension of common) to generate smartName if needed
        if (commonInfo.smartIgnore) {
            commonInfo.smartName = 'ignore';
        } else if (!commonInfo.hasOwnProperty('smartName')) {
            commonInfo.smartName = null;
        }
        delete commonInfo.smartIgnore;
    }
    var obj = {
        type: 'state',
        common: commonInfo,
        native: {
            uuid: stateUuid
        }
    };
    updateObject(id, obj);
    if (stateEventHandler) {
        addStateEventHandler(stateUuid, function (value) {
            stateEventHandler(id, value);
        });
    }
}

function addStateEventHandler(uuid, eventHandler, name /* optional */) {
    if (stateEventHandlers[uuid] === undefined) {
        stateEventHandlers[uuid] = [];
    }
    
    if (name) {
        removeStateEventHandler(uuid, name);
    }
    
    stateEventHandlers[uuid].push({name: name, handler: eventHandler});
}

function removeStateEventHandler(uuid, name) {
    if (stateEventHandlers[uuid] === undefined || !name) {
        return false;
    }
    
    var found = false;
    for (var i in stateEventHandlers[uuid]) {
        if (stateEventHandlers[uuid][i].name == name) {
            stateEventHandlers[uuid].splice(i, 1);
            found = true;
        }
    }

    return found;
}

function addStateChangeListener(id, listener) {
    stateChangeListeners[adapter.namespace + '.' + id] = listener;
}


function setStateAck(id, value) {
    currentStateValues[adapter.namespace + '.' + id] = value;
    adapter.setState(id, {val: value, ack: true});
}

function setFormattedStateAck(id, value, format) {
    value = sprintf(format, value);
    setStateAck(id, value);
}

function setTimeStateAck(id, miniserverTime) {
    var value = (miniserverTime * 1000) + new Date(2009, 0, 1).getTime();
    setStateAck(id, value);
}


function handleEvent(uuid, evt) {
    var stateEventHandlerList = stateEventHandlers[uuid];
    if (stateEventHandlerList === undefined) {
        adapter.log.debug('Unknown event UUID: ' + uuid);
        return;
    }

    stateEventHandlerList.forEach(function (item) {
        try {
            item.handler(evt);
        } catch (e) {
            adapter.log.error('Error while handling event UUID ' + uuid + ': ' + e);
        }
    });
}
