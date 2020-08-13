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
exports.WindowMonitor = void 0;
const control_base_1 = require("./control-base");
class WindowMonitor extends control_base_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'sensor',
                },
                native: control,
            });
            yield this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
                'windowStates',
                'numOpen',
                'numClosed',
                'numTilted',
                'numOffline',
                'numLocked',
                'numUnlocked',
            ]);
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'numOpen', 'number', 'value');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'numClosed', 'number', 'value');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'numTilted', 'number', 'value');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'numOffline', 'number', 'value');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'numLocked', 'number', 'value');
            yield this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'numUnlocked', 'number', 'value');
            if (!control.hasOwnProperty('details') ||
                !control.details.hasOwnProperty('windows') ||
                !control.states.hasOwnProperty('windowStates')) {
                return;
            }
            const windowPositions = {
                1: 'closed',
                2: 'tilted',
                4: 'open',
                8: 'locked',
                16: 'unlocked',
            };
            for (const index in control.details.windows) {
                const window = control.details.windows[index];
                const id = uuid + '.' + (parseInt(index) + 1);
                yield this.updateObjectAsync(id, {
                    type: 'channel',
                    common: {
                        name: control.name + ': ' + window.name,
                        role: 'sensor.window.3',
                        smartIgnore: true,
                    },
                    native: window,
                });
                for (let mask = 1; mask <= 16; mask *= 2) {
                    const windowPosition = windowPositions[mask];
                    const obj = {
                        type: 'state',
                        common: {
                            name: control.name + ': ' + window.name + ': ' + windowPosition,
                            read: true,
                            write: false,
                            type: 'boolean',
                            role: 'indicator',
                            smartIgnore: true,
                        },
                        native: {},
                    };
                    yield this.updateObjectAsync(id + '.' + windowPosition, obj);
                }
            }
            this.addStateEventHandler(control.states.windowStates, (value) => {
                const values = value.toString().split(',');
                for (const index in values) {
                    for (let mask = 1; mask <= 16; mask *= 2) {
                        const windowPosition = windowPositions[mask];
                        this.setStateAck(uuid + '.' + (parseInt(index) + 1) + '.' + windowPosition, (parseInt(values[index]) & mask) == mask);
                    }
                }
            });
        });
    }
}
exports.WindowMonitor = WindowMonitor;
//# sourceMappingURL=WindowMonitor.js.map