"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Daytimer = void 0;
const control_base_1 = require("./control-base");
class Daytimer extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        var _a;
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'timer',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'mode',
            'override',
            'value',
            'needsActivation',
            'modeList',
            'entriesAndDefaultValue',
            'resetActive',
        ]);
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'mode', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'override', 'number', 'value', { unit: 'sec' });
        // value is a number for analog daytimers and a boolean for digital ones
        if (control.details.analog) {
            await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'number', 'value');
            if (control.details.hasOwnProperty('format')) {
                await this.updateStateObjectAsync(uuid + '.value-formatted', {
                    name: control.name + ': formatted value',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                }, control.states.value, async (name, value) => {
                    await this.setFormattedStateAck(name, value, control.details.format);
                });
            }
        }
        else {
            await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'value', 'boolean', 'indicator');
            if (control.details.hasOwnProperty('text')) {
                const text = (_a = control.details) === null || _a === void 0 ? void 0 : _a.text;
                await this.updateStateObjectAsync(uuid + '.value-formatted', {
                    name: control.name + ': formatted value',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                }, control.states.value, async (name, value) => {
                    await this.setStateAck(name, (this.convertStateToBoolean(value) ? text === null || text === void 0 ? void 0 : text.on : text === null || text === void 0 ? void 0 : text.off) || null);
                });
            }
        }
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'needsActivation', 'boolean', 'indicator');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'resetActive', 'boolean', 'indicator');
        if (control.states.hasOwnProperty('mode') && control.states.hasOwnProperty('modeList')) {
            const obj = {
                type: 'state',
                common: {
                    name: control.name + ': mode as text',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                native: {
                    mode: control.states.mode,
                    modeList: control.states.modeList,
                },
            };
            await this.updateObjectAsync(uuid + '.mode-text', obj);
            let modeNames = {};
            let mode = '-';
            const updateModeText = async () => {
                if (modeNames.hasOwnProperty(mode)) {
                    await this.setStateAck(uuid + '.mode-text', modeNames[mode]);
                }
            };
            this.addStateEventHandler(control.states.mode, async (value) => {
                mode = this.convertStateToInt(value).toString();
                await updateModeText();
            });
            this.addStateEventHandler(control.states.modeList, async (value) => {
                if (!value) {
                    return;
                }
                // format of value: 0:mode=0;name=\"Feiertag\",1:mode=1;name=\"Urlaub\"
                modeNames = value
                    .toString()
                    .split(',')
                    .map((item) => item
                    .split(':', 2)[1]
                    .split(';')
                    .map((pair) => pair.split('=', 2)))
                    .reduce((old, pairs) => {
                    const modePair = pairs.find((p) => p[0] === 'mode');
                    const namePair = pairs.find((p) => p[0] === 'name');
                    if (!modePair || !namePair) {
                        return old;
                    }
                    return { ...old, [modePair[1]]: namePair[1].replace(/^\\?"(.+?)\\?"$/g, '$1') };
                }, {});
                await updateModeText();
            });
        }
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'pulse');
        this.addStateChangeListener(uuid + '.pulse', () => {
            this.sendCommand(control.uuidAction, 'pulse');
        }, { selfAck: true });
    }
}
exports.Daytimer = Daytimer;
//# sourceMappingURL=Daytimer.js.map