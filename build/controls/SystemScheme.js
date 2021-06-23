"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemScheme = void 0;
const control_base_1 = require("./control-base");
class SystemScheme extends control_base_1.ControlBase {
    async loadAsync(_type, _uuid, _control) {
        // SystemScheme has no states, thus we don't use it at all
    }
}
exports.SystemScheme = SystemScheme;
//# sourceMappingURL=SystemScheme.js.map