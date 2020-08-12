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
exports.CentralAudioZone = void 0;
const ControlBase_1 = require("./ControlBase");
class CentralAudioZone extends ControlBase_1.ControlBase {
    loadAsync(type, uuid, control) {
        return __awaiter(this, void 0, void 0, function* () {
            this.updateObjectAsync(uuid, {
                type: type,
                common: {
                    name: control.name,
                    role: 'media.music',
                },
                native: control,
            });
            this.createButtonCommandStateObjectAsync(control.name, uuid, 'control', { smartIgnore: false });
            this.addStateChangeListener(uuid + '.control', (oldValue, newValue) => {
                this.sendCommand(control.uuidAction, newValue ? 'play' : 'pause');
            });
        });
    }
}
exports.CentralAudioZone = CentralAudioZone;
//# sourceMappingURL=CentralAudioZone.js.map