"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentralAudioZone = void 0;
const control_base_1 = require("./control-base");
class CentralAudioZone extends control_base_1.ControlBase {
    async loadAsync(type, uuid, control) {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'media.music',
            },
            native: { control },
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'control');
        this.addStateChangeListener(uuid + '.control', (oldValue, newValue) => {
            this.sendCommand(control.uuidAction, newValue ? 'play' : 'pause');
        });
    }
}
exports.CentralAudioZone = CentralAudioZone;
//# sourceMappingURL=CentralAudioZone.js.map