"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoxoneHandlerBase = void 0;
const sprintf_js_1 = require("sprintf-js");
class LoxoneHandlerBase {
    constructor(adapter) {
        this.adapter = adapter;
    }
    async loadSubControlsAsync(parentUuid, control) {
        return await this.adapter.loadSubControlsAsync(parentUuid, control);
    }
    addStateChangeListener(id, listener) {
        this.adapter.addStateChangeListener(id, listener);
    }
    addStateEventHandler(uuid, eventHandler, name) {
        this.adapter.addStateEventHandler(uuid, eventHandler, name);
    }
    removeStateEventHandler(uuid, name) {
        return this.adapter.removeStateEventHandler(uuid, name);
    }
    sendCommand(uuid, action) {
        this.adapter.sendCommand(uuid, action);
    }
    async setStateAck(id, value) {
        await this.adapter.setStateAck(id, value);
    }
    async setFormattedStateAck(id, value, format) {
        value = sprintf_js_1.sprintf(format, value);
        await this.setStateAck(id, value);
    }
    convertStateToInt(value) {
        return !value ? 0 : parseInt(value.toString());
    }
    convertStateToFloat(value) {
        return !value ? 0 : parseFloat(value.toString());
    }
    getCachedStateValue(id) {
        return this.adapter.getCachedStateValue(id);
    }
    async updateObjectAsync(id, obj) {
        await this.adapter.updateObjectAsync(id, obj);
    }
    async updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler) {
        await this.adapter.updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler);
    }
    async loadOtherControlStatesAsync(controlName, uuid, states, skipKeys) {
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
    async createSimpleControlStateObjectAsync(controlName, uuid, states, name, type, role, commonExt) {
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
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, states[name], this.setStateAck.bind(this));
        }
    }
    async createBooleanControlStateObjectAsync(controlName, uuid, states, name, role, commonExt) {
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
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, states[name], async (name, value) => {
                await this.setStateAck(name, value == 1);
            });
        }
    }
    async createListControlStateObjectAsync(controlName, uuid, states, name) {
        if (states !== undefined && states.hasOwnProperty(name)) {
            await this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                // TODO: re-add: smartIgnore: true,
            }, states[name], async (name, value) => {
                await this.setStateAck(name, !value ? [] : value.toString().split('|'));
            });
        }
    }
    async createPercentageControlStateObjectAsync(controlName, uuid, states, name, role, commonExt) {
        if (states !== undefined && states.hasOwnProperty(name)) {
            let common = {
                name: controlName + ': ' + name,
                read: true,
                write: false,
                type: 'number',
                role: role,
                unit: '%',
                smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = { ...common, ...commonExt };
            }
            await this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, states[name], async (name, value) => {
                await this.setStateAck(name, Math.round(this.convertStateToFloat(value) * 100));
            });
        }
    }
    async createButtonCommandStateObjectAsync(controlName, uuid, name, commonExt) {
        let common = {
            name: controlName + ': ' + name,
            read: false,
            write: true,
            type: 'boolean',
            role: 'button',
            smartIgnore: true,
        };
        if (commonExt && typeof commonExt === 'object') {
            common = { ...common, ...commonExt };
        }
        await this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, uuid);
    }
    normalizeName(name) {
        return name.trim().replace(/[^\wäöüÄÖÜäöüéàèêçß]+/g, '_');
    }
}
exports.LoxoneHandlerBase = LoxoneHandlerBase;
//# sourceMappingURL=loxone-handler-base.js.map