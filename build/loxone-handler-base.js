"use strict";
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
exports.LoxoneHandlerBase = void 0;
const sprintf_js_1 = require("sprintf-js");
class LoxoneHandlerBase {
    constructor(adapter) {
        this.adapter = adapter;
    }
    loadSubControlsAsync(parentUuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.adapter.loadSubControlsAsync(parentUuid, control);
        });
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
    setStateAck(id, value) {
        return this.adapter.setStateAck(id, value);
    }
    setFormattedStateAck(id, value, format) {
        value = sprintf_js_1.sprintf(format, value);
        return this.setStateAck(id, value);
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
    updateObjectAsync(id, obj) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.adapter.updateObjectAsync(id, obj);
        });
    }
    updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.adapter.updateStateObjectAsync(id, commonInfo, stateUuid, stateEventHandler);
        });
    }
    loadOtherControlStatesAsync(controlName, uuid, states, skipKeys) {
        return __awaiter(this, void 0, void 0, function* () {
            if (states === undefined) {
                return;
            }
            for (const stateName in states) {
                if (skipKeys.indexOf(stateName) !== -1) {
                    continue;
                }
                yield this.createSimpleControlStateObjectAsync(controlName, uuid, states, stateName, 'string', 'text');
            }
        });
    }
    createSimpleControlStateObjectAsync(controlName, uuid, states, name, type, role, commonExt) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    common = Object.assign(Object.assign({}, common), commonExt);
                }
                yield this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, states[name], this.setStateAck.bind(this));
            }
        });
    }
    createBooleanControlStateObjectAsync(controlName, uuid, states, name, role, commonExt) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    common = Object.assign(Object.assign({}, common), commonExt);
                }
                yield this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, states[name], (name, value) => {
                    return this.setStateAck(name, value == 1);
                });
            }
        });
    }
    createListControlStateObjectAsync(controlName, uuid, states, name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (states !== undefined && states.hasOwnProperty(name)) {
                yield this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), {
                    name: controlName + ': ' + name,
                    read: true,
                    write: false,
                    type: 'array',
                    role: 'list',
                }, states[name], (name, value) => {
                    return this.setStateAck(name, !value ? [] : value.toString().split('|'));
                });
            }
        });
    }
    createPercentageControlStateObjectAsync(controlName, uuid, states, name, role, commonExt) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    common = Object.assign(Object.assign({}, common), commonExt);
                }
                yield this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, states[name], (name, value) => {
                    return this.setStateAck(name, Math.round(this.convertStateToFloat(value) * 100));
                });
            }
        });
    }
    createButtonCommandStateObjectAsync(controlName, uuid, name, commonExt) {
        return __awaiter(this, void 0, void 0, function* () {
            let common = {
                name: controlName + ': ' + name,
                read: false,
                write: true,
                type: 'boolean',
                role: 'button',
                smartIgnore: true,
            };
            if (commonExt && typeof commonExt === 'object') {
                common = Object.assign(Object.assign({}, common), commonExt);
            }
            yield this.updateStateObjectAsync(uuid + '.' + this.normalizeName(name), common, uuid);
        });
    }
    normalizeName(name) {
        return name.trim().replace(/[^\wäöüÄÖÜäöüéàèêçß]+/g, '_');
    }
}
exports.LoxoneHandlerBase = LoxoneHandlerBase;
//# sourceMappingURL=loxone-handler-base.js.map