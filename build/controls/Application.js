"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Application = void 0;
const control_base_1 = require("./control-base");
class Application extends control_base_1.ControlBase {
    async loadAsync(_type, _uuid, _control) {
        // Application has no states, thus we don't use it at all
    }
}
exports.Application = Application;
//# sourceMappingURL=Application.js.map