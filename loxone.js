// always required: utils
var utils = require(__dirname + '/lib/utils');

// other dependencies:
var loxoneWsApi = require('node-lox-ws-api');
var sprintf = require("sprintf-js").sprintf;

// create the adapter object
var adapter = utils.adapter('loxone');

// unloading
adapter.on('unload', function (callback) {
    callback();
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    if (!id || !state || state.ack) {
        return;
    }
    
    // Warning, state can be null if it was deleted
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
});

// startup
adapter.on('ready', function () {
    main();
});

var stateEventHandlers = {};

function main() {
    var client = new loxoneWsApi(adapter.config.host + ':' + adapter.config.port, adapter.config.username, adapter.config.password, true, 'AES-256-CBC');
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

    //adapter.subscribeStates('*');
}

function loadStructureFile(data) {
    stateEventHandlers = {};
    loadGlobalStates(data.globalStates);
    loadControls(data.controls);
}

function loadGlobalStates(globalStates) {
    var globalStateInfos = {
        operatingMode: {
            type: 'number',
            role: 'value'
        },
        sunrise: {
            type: 'number',
            role: 'value'
        },
        sunset: {
            type: 'number',
            role: 'value'
        },
        notifications: {
            type: 'number',
            role: 'value'
        },
        modifications: {
            type: 'number',
            role: 'value'
        }
    };
    for (var globalStateName in globalStates) {
        var info = globalStateInfos[globalStateName];
        createStateObject(
            globalStateName,
            {
                name: globalStateName,
                read: true,
                write: false,
                type: info === undefined ? 'string' : info.type,
                role: info === undefined ? 'text' : info.role
            },
            globalStates[globalStateName],
            setStateAck);
    }
}

function loadControls(controls) {
    for (var uuid in controls) {
        var control = controls[uuid];
        if (!control.hasOwnProperty('type')) {
            continue;
        }

        try {
            eval('load' + control.type + 'Control(control)');
        } catch (e) {
            adapter.log.error('Unsupported control type ' + control.type + ': ' + e);
        };
    }
}

function loadInfoOnlyDigitalControl(control) {
    var deviceName = normalizeName(control.name);
    adapter.setObject(deviceName, {
        type: 'device',
        common: {
            name: control.name,
            role: 'switch'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, deviceName, control.states, ['active']);

    if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('active')) {
        return;
    }
    
    createStateObject(
        deviceName + '.active',
        {
            name: control.name + ': active',
            read: true,
            write: false,
            type: 'boolean',
            role: 'indicator'
        },
        control.states.active,
        function (name, value) {
            setStateAck(name, value == 1);
        });
    
    if (!control.hasOwnProperty('details')) {
        return;
    }
    
    if (control.details.hasOwnProperty('text')) {
        createStateObject(
            deviceName + '.active-text',
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
            deviceName + '.active-image',
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
            deviceName + '.active-color',
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

function loadInfoOnlyAnalogControl(control) {
    var deviceName = normalizeName(control.name);
    adapter.setObject(deviceName, {
        type: 'device',
        common: {
            name: control.name,
            role: 'sensor'
        },
        native: control
    });
    
    loadOtherControlStates(control.name, deviceName, control.states, ['value']);
    
    if (!control.hasOwnProperty('states') || !control.states.hasOwnProperty('value')) {
        return;
    }
    
    createStateObject(
        deviceName + '.value',
        {
            name: control.name + ': value',
            read: true,
            write: false,
            type: 'number',
            role: 'value'
        },
        control.states.value,
        setStateAck);
    
    if (!control.hasOwnProperty('details')) {
        return;
    }
    
    if (control.details.hasOwnProperty('format')) {
        createStateObject(
            deviceName + '.value-formatted',
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

function loadOtherControlStates(controlName, deviceName, states, skipKeys) {
    if (states === undefined) {
        return;
    }

    for (var stateName in states) {
        if (skipKeys.indexOf(stateName) !== -1) {
            continue;
        }

        var uuid = states[stateName];
        createStateObject(
            deviceName + '.' + normalizeName(stateName),
            {
                name: controlName + ': ' + stateName,
                read: true,
                write: false,
                type: 'string',
                role: 'text'
            },
            uuid,
            setStateAck);
    }
}

function normalizeName(name) {
    return name.trim().replace(/\W+/g, '_');
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
    if (stateEventHandlers[stateUuid] === undefined) {
        stateEventHandlers[stateUuid] = [];
    }

    stateEventHandlers[stateUuid].push(function (value) {
        stateEventHandler(id, value);
    });
}

function setStateAck(name, value) {
    adapter.setState(name, { val: value, ack: true });
}

function setFormattedStateAck(name, value, format) {
    value = sprintf(format, value);
    setStateAck(name, value);
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
