"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlBase = void 0;
const loxone_handler_base_1 = require("../loxone-handler-base");
class ControlBase extends loxone_handler_base_1.LoxoneHandlerBase {
    constructor(adapter) {
        super(adapter);
        this.adapter = adapter;
    }
}
exports.ControlBase = ControlBase;
//# sourceMappingURL=control-base.js.map