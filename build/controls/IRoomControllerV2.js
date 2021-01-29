"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IRoomControllerV2 = void 0;
const control_base_1 = require("./control-base");
class IRoomControllerV2 extends control_base_1.ControlBase {
    constructor() {
        super(...arguments);
        this.uuid = '';
    }
    async loadAsync(type, uuid, control) {
        this.uuid = uuid;
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'thermo',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, ['comfortTolerance']);
        await this.updateStateObjectAsync(uuid + '.comfortTolerance', {
            name: control.name + ': comfortTolerance',
            read: true,
            write: true,
            type: 'number',
            role: 'level.temperature',
        }, control.states.comfortTolerance, async (name, value) => {
            await this.setStateAck(this.uuid + '.' + name, value);
        });
        this.addStateChangeListener(uuid + '.comfortTolerance', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, 'setComfortTolerance/' + newValue);
        });
    }
}
exports.IRoomControllerV2 = IRoomControllerV2;
//# sourceMappingURL=IRoomControllerV2.js.map