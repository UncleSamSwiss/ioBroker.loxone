'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Remote = void 0;
const control_base_1 = require("./control-base");
/**
 * Remote aka. Media Controller
 */
class Remote extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        this.adapter.log.debug('Remote controls: ' + JSON.stringify(control));
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'media',
            },
            native: { control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['jLocked', 'mode']);
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'mode', 'string', 'text', {
            write: true,
        });
        this.addStateChangeListener(uuid + '.mode', (oldValue, newValue) => {
            if (newValue && newValue !== '0') {
                // Send the actual mode number
                this.sendCommand(control.uuidAction, `mode/${newValue}`);
            }
            else {
                // Sending mode zero is not supported so sent reset/all off
                this.sendCommand(control.uuidAction, 'reset');
            }
        });
    }
}
exports.Remote = Remote;
//# sourceMappingURL=Remote.js.map