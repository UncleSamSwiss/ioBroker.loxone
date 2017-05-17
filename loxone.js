"use strict";

// always required: utils
var utils = require(__dirname + '/lib/utils');

// other dependencies:
var loxoneWsApi = require('node-lox-ws-api');
var sprintf = require("sprintf-js").sprintf;

// create the adapter object
var adapter = utils.adapter('loxone');

var stateChangeListeners = {};
var stateEventHandlers = {};
var operatingModes = {};
var currentStateValues = {};
var client = undefined;

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
        
        main();
    });
});

function main() {
    client = new loxoneWsApi(adapter.config.host + ':' + adapter.config.port, adapter.config.username, adapter.config.password, true, 'AES-256-CBC');
    client.connect();
    
    client.on('connect', function () {
        //adapter.log('Miniserver connected (' + config.host + ':' + config.port) + ')';
        adapter.log.info('Miniserver connected');
    });
    
    client.on('authorized', function () {
        adapter.log.debug('authorized');
        //node.authenticated = true;
        //node.connection = client;
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
        //node.connected = false;
        //node.authenticated = false;
        //node.connection = null;
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
    operatingModes = data.operatingModes;
    loadGlobalStates(data.globalStates);
    loadControls(data.controls);
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
    adapter.setObject(
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
                uuid: globalStates['operatingMode']
            }
        });

    for (var globalStateName in globalStates) {
        var info = globalStateInfos.hasOwnProperty(globalStateName) ? globalStateInfos[globalStateName] : defaultInfo;
        createStateObject(
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
            eval('load' + control.type + 'Control(uuid, control)');
        } catch (e) {
            adapter.log.error('Unsupported control type ' + control.type + ': ' + e);
            
            if (!hasUnsupported) {
                hasUnsupported = true;
                adapter.setObject('Unsupported', {
                    type: 'device',
                    common: {
                        name: 'Unsupported',
                        role: 'info'
                    },
                    native: control
                });
            }
            
            adapter.setObject('Unsupported.' + uuid, {
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
        };
    }
}

// this function is called if the control has no type (currently seems to be only for window monitoring)
function loadControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'info'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, []);
}

function loadAlarmControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'alarm'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['armed', 'nextLevel', 'nextLevelDelay', 'nextLevelDelayTotal', 'level', 'startTime', 'armedDelay', 'armedDelayTotal', 'sensors', 'disabledMove']);

    createBooleanControlStateObject(control.name, uuid, control.states, 'armed', 'switch', true);
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevel', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevelDelay', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevelDelayTotal', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'level', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'startTime', 'string', 'value.datetime');
    createSimpleControlStateObject(control.name, uuid, control.states, 'armedDelay', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'armedDelayTotal', 'number', 'value.interval');
    createListControlStateObject(control.name, uuid, control.states, 'sensors');
    createBooleanControlStateObject(control.name, uuid, control.states, 'disabledMove', 'switch', true);
    
    addStateChangeListener(uuid + '.armed', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        }
        else {
            client.send_cmd(control.uuidAction, 'off');
        }
    });
    
    addStateChangeListener(uuid + '.disabledMove', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'dismv/0');
        }
        else {
            client.send_cmd(control.uuidAction, 'dismv/1');
        }
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'delayedOn');
    addStateChangeListener(uuid + '.delayedOn', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'delayedon/' + (newValue ? 1 : 0));
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'quit');
    addStateChangeListener(uuid + '.quit', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'quit');
    });

    // TODO: check what we can do with subControls
}

function loadGateControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'blind'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['position', 'active', 'preventOpen', 'preventClose']);
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'position', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'active', 'number', 'level', true);
    createBooleanControlStateObject(control.name, uuid, control.states, 'preventOpen', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'preventClose', 'indicator');

    addStateChangeListener(uuid + '.active', function (oldValue, newValue) {
        oldValue = parseInt(oldValue);
        newValue = parseInt(newValue);
        if (newValue === oldValue) {
            return;
        }
        else if (newValue === 1) {
            if (oldValue === -1) {
                // open twice because we are currently closing
                client.send_cmd(control.uuidAction, 'open');
            }
            client.send_cmd(control.uuidAction, 'open');
        }
        else if (newValue === -1) {
            if (oldValue === 1) {
                // close twice because we are currently opening
                client.send_cmd(control.uuidAction, 'close');
            }
            client.send_cmd(control.uuidAction, 'close');
        }
        else if (newValue === 0) {
            if (oldValue === 1) {
                client.send_cmd(control.uuidAction, 'close');
            }
            else if (oldValue === -1) {
                client.send_cmd(control.uuidAction, 'open');
            }
        }
    });
}

function loadInfoOnlyDigitalControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
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
        createStateObject(
            uuid + '.active-text',
            {
                name: control.name + ': active as text',
                read: true,
                write: false,
                type: 'string',
                role: 'text'
            },
            control.states.active,
            function (name, value) {
                setStateAck(name, value == 1 ? control.details.text.on : control.details.text.off);
            });
    }
    
    if (control.details.hasOwnProperty('image')) {
        createStateObject(
            uuid + '.active-image',
            {
                name: control.name + ': active as image',
                read: true,
                write: false,
                type: 'string',
                role: 'text'
            },
            control.states.active,
            function (name, value) {
                setStateAck(name, value == 1 ? control.details.image.on : control.details.image.off);
            });
    }
    
    if (control.details.hasOwnProperty('color')) {
        createStateObject(
            uuid + '.active-color',
            {
                name: control.name + ': active as color',
                read: true,
                write: false,
                type: 'string',
                role: 'text'
            },
            control.states.active,
            function (name, value) {
                setStateAck(name, value == 1 ? control.details.color.on : control.details.color.off);
            });
    }
}

function loadInfoOnlyAnalogControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
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
        createStateObject(
            uuid + '.value-formatted',
            {
                name: control.name + ': formatted value',
                read: true,
                write: false,
                type: 'string',
                role: 'text'
            },
            control.states.value,
            function (name, value) {
                setFormattedStateAck(name, value, control.details.format);
            });
    }
}

function loadIntercomControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'blind'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['bell', 'lastBellEvents', 'version']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'bell', 'indicator');
    createListControlStateObject(control.name, uuid, control.states, 'lastBellEvents');
    createSimpleControlStateObject(control.name, uuid, control.states, 'version', 'string', 'text');

    // TODO: check what we can do with subControls
    
    createSwitchCommandStateObject(control.name, uuid, 'answer');
    addStateChangeListener(uuid + '.answer', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'answer');
    });
}

function loadJalousieControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'blind'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['up', 'down', 'position', 'shadePosition', 'safetyActive', 'autoAllowed', 'autoActive', 'locked']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'up', 'indicator', true);
    createBooleanControlStateObject(control.name, uuid, control.states, 'down', 'indicator', true);
    createSimpleControlStateObject(control.name, uuid, control.states, 'position', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'shadePosition', 'number', 'value');
    createBooleanControlStateObject(control.name, uuid, control.states, 'safetyActive', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'autoAllowed', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'autoActive', 'indicator', true);
    createBooleanControlStateObject(control.name, uuid, control.states, 'locked', 'indicator');
    
    addStateChangeListener(uuid + '.up', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'up');
        }
        else {
            client.send_cmd(control.uuidAction, 'UpOff');
        }
    });
    addStateChangeListener(uuid + '.down', function (oldValue, newValue) {
        if (newValue) {
            client.send_cmd(control.uuidAction, 'down');
        }
        else {
            client.send_cmd(control.uuidAction, 'DownOff');
        }
    });
    addStateChangeListener(uuid + '.autoActive', function (oldValue, newValue) {
        if (newValue == oldValue) {
            return;
        }
        else if (newValue) {
            client.send_cmd(control.uuidAction, 'auto');
        }
        else {
            client.send_cmd(control.uuidAction, 'NoAuto');
        }
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'fullUp');
    addStateChangeListener(uuid + '.fullUp', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'FullUp');
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'fullDown');
    addStateChangeListener(uuid + '.fullDown', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'FullDown');
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'shade');
    addStateChangeListener(uuid + '.shade', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'shade');
    });
}

function loadLightControllerControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'light'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['activeScene', 'sceneList']);

    createSimpleControlStateObject(control.name, uuid, control.states, 'activeScene', 'number', 'level', true);
    addStateChangeListener(uuid + '.activeScene', function (oldValue, newValue) {
        newValue = parseInt(newValue);
        if (newValue === 9) {
            client.send_cmd(control.uuidAction, 'on');
        }
        else {
            client.send_cmd(control.uuidAction, newValue.toString());
        }
    });
    
    if (control.states.hasOwnProperty('sceneList')) {
        createStateObject(
            uuid + '.sceneList',
            {
                name: control.name + ': sceneList',
                read: true,
                write: false,
                type: 'array',
                role: 'list'
            },
            control.states.sceneList,
            function (name, value) {
                // weird documentation: they say it's 'text' within the struct, but I get the value directly; let's support both
                if (value.hasOwnProperty('text')) {
                    setStateAck(name, value.text.split(','));
                }
                else {
                    setStateAck(name, value.toString().split(','));
                }
            });
    }
    
    createSwitchCommandStateObject(control.name, uuid, 'plus');
    addStateChangeListener(uuid + '.plus', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'plus');
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'minus');
    addStateChangeListener(uuid + '.minus', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'minus');
    });

    // TODO: currently we don't support scene modifications ("learn" and "delete"),
    // IMHO this should be done using the Loxone Web interface

    // TODO: check what we can do with subControls
}

function loadMeterControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'sensor'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['actual', 'total']);
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'actual', 'number', 'value.power.consumption');
    createSimpleControlStateObject(control.name, uuid, control.states, 'total', 'number', 'value.power.consumption');
    
    createSwitchCommandStateObject(control.name, uuid, 'reset');
    addStateChangeListener(uuid + '.reset', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'reset');
    });
    
    if (!control.hasOwnProperty('details')) {
        return;
    }
    
    if (control.details.hasOwnProperty('actualFormat')) {
        createStateObject(
            uuid + '.actual-formatted',
            {
                name: control.name + ': formatted actual value',
                read: true,
                write: false,
                type: 'string',
                role: 'text'
            },
            control.states.actual,
            function (name, value) {
                setFormattedStateAck(name, value, control.details.actualFormat);
            });
    }
    
    if (control.details.hasOwnProperty('totalFormat')) {
        createStateObject(
            uuid + '.total-formatted',
            {
                name: control.name + ': formatted total value',
                read: true,
                write: false,
                type: 'string',
                role: 'text'
            },
            control.states.total,
            function (name, value) {
                setFormattedStateAck(name, value, control.details.totalFormat);
            });
    }
}

function loadPushbuttonControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'switch'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['active']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'active', 'switch', true);

    addStateChangeListener(uuid + '.active', function (oldValue, newValue) {
        if (newValue == oldValue) {
            return;
        }
        else if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        }
        else {
            client.send_cmd(control.uuidAction, 'off');
        }
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'pulse');
    addStateChangeListener(uuid + '.pulse', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'pulse');
    });
}

function loadSmokeAlarmControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'alarm'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['nextLevel', 'nextLevelDelay', 'nextLevelDelayTotal', 'level', 'sensors', 'acousticAlarm', 'testAlarm', 'alarmCause', 'startTime', 'timeServiceMode']);
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevel', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevelDelay', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'nextLevelDelayTotal', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'level', 'number', 'value');
    createListControlStateObject(control.name, uuid, control.states, 'sensors');
    createBooleanControlStateObject(control.name, uuid, control.states, 'acousticAlarm', 'indicator');
    createBooleanControlStateObject(control.name, uuid, control.states, 'testAlarm', 'indicator');
    createSimpleControlStateObject(control.name, uuid, control.states, 'alarmCause', 'number', 'value');
    createSimpleControlStateObject(control.name, uuid, control.states, 'startTime', 'string', 'value.datetime');
    createSimpleControlStateObject(control.name, uuid, control.states, 'timeServiceMode', 'number', 'level.interval', true);
    
    createSwitchCommandStateObject(control.name, uuid, 'mute');
    addStateChangeListener(uuid + '.mute', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'mute');
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'quit');
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

    // TODO: check what we can do with subControls
}

function loadSwitchControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'switch'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['active']);
    
    createBooleanControlStateObject(control.name, uuid, control.states, 'active', 'switch', true);
    
    addStateChangeListener(uuid + '.active', function (oldValue, newValue) {
        if (newValue == oldValue) {
            return;
        }
        else if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        }
        else {
            client.send_cmd(control.uuidAction, 'off');
        }
    });
}

function loadTimedSwitchControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'switch'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['deactivationDelayTotal', 'deactivationDelay']);
    
    createSimpleControlStateObject(control.name, uuid, control.states, 'deactivationDelayTotal', 'number', 'value.interval');
    createSimpleControlStateObject(control.name, uuid, control.states, 'deactivationDelay', 'number', 'value.interval');
    
    createSwitchCommandStateObject(control.name, uuid, 'active');
    addStateChangeListener(uuid + '.active', function (oldValue, newValue) {
        if (newValue == oldValue) {
            return;
        }
        else if (newValue) {
            client.send_cmd(control.uuidAction, 'on');
        }
        else {
            client.send_cmd(control.uuidAction, 'off');
        }
    });
    
    createSwitchCommandStateObject(control.name, uuid, 'pulse');
    addStateChangeListener(uuid + '.pulse', function (oldValue, newValue) {
        client.send_cmd(control.uuidAction, 'pulse');
    });
}

function loadTrackerControl(uuid, control) {
    adapter.setObject(uuid, {
        type: 'device',
        common: {
            name: control.name,
            role: 'info'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, uuid, control.states, ['entries']);
    
    createListControlStateObject(control.name, uuid, control.states, 'entries');
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

function loadWeatherServer(data) {
    if (data === undefined || !data.hasOwnProperty('states') || !data.states.hasOwnProperty('actual')) {
        return;
    }
    
    var deviceName = 'WeatherServer';
    adapter.setObject(deviceName, {
        type: 'device',
        common: {
            name: deviceName,
            role: 'weather'
        },
        native: data
    });
    
    var setWeatherObject = function (channelName, id, name, type, role) {
        adapter.setObject(deviceName + '.' + channelName + '.' + id, {
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
        adapter.setObject(deviceName + '.' + channelName, {
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
            var channelName = 'Hour' + sprintf("%02d", i);
            if (i >= forecastChannelsCount) {
                setWeatherObjects(channelName);
                forecastChannelsCount++;
            }
            
            setWeatherStates(deviceName + '.' + channelName, evt.entry[i]);
        }
    });
}

function createSimpleControlStateObject(controlName, uuid, states, name, type, role, writable) {
    if (states !== undefined && states.hasOwnProperty(name)) {
        createStateObject(
            uuid + '.' + normalizeName(name),
            {
                name: controlName + ': ' + name,
                read: true,
                write: writable === true,
                type: type,
                role: role
            },
            states[name],
            setStateAck);
    }
}

function createBooleanControlStateObject(controlName, uuid, states, name, role, writable) {
    if (states !== undefined && states.hasOwnProperty(name)) {
        createStateObject(
            uuid + '.' + normalizeName(name),
            {
                name: controlName + ': ' + name,
                read: true,
                write: writable === true,
                type: 'boolean',
                role: role
            },
            states[name],
            function (name, value) {
                setStateAck(name, value == 1);
            });
    }
}

function createListControlStateObject(controlName, uuid, states, name) {
    if (states !== undefined && states.hasOwnProperty(name)) {
        createStateObject(
            uuid + '.' + normalizeName(name),
            {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: 'array',
                role: 'list'
            },
            states[name],
            function (name, value) {
                setStateAck(name, value.toString().split('|'));
            });
    }
}

function createSwitchCommandStateObject(controlName, uuid, name) {
    var obj = {
        type: 'state',
        common: {
            name: controlName + ': ' + name,
            read: false,
            write: true,
            type: 'boolean',
            role: 'switch'
        },
        native: {}
    };
    adapter.setObject(uuid + '.' + normalizeName(name), obj);
}

function normalizeName(name) {
    return name.trim().replace(/[^\wäöüÄÖÜäöüéàèêçß]+/g, '_');
}

function createStateObject(id, commonInfo, stateUuid, stateEventHandler) {
    var obj = {
        type: 'state',
        common: commonInfo,
        native: {
            uuid: stateUuid
        }
    };
    adapter.setObject(id, obj);
    addStateEventHandler(stateUuid, function (value) {
        stateEventHandler(id, value);
    });
}

function addStateEventHandler(uuid, eventHandler) {
    if (stateEventHandlers[uuid] === undefined) {
        stateEventHandlers[uuid] = [];
    }
    
    stateEventHandlers[uuid].push(eventHandler);
}

function addStateChangeListener(id, listener) {
    stateChangeListeners[adapter.namespace + '.' + id] = listener;
}


function setStateAck(id, value) {
    currentStateValues[adapter.namespace + '.' + id] = value;
    adapter.setState(id, { val: value, ack: true });
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

    stateEventHandlerList.forEach(function (stateEventHandler) {
        stateEventHandler(evt);
    });
}
