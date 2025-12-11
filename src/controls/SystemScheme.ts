import { ControlBase } from './control-base';

/**
 * Handler for the SystemScheme control.
 */
export class SystemScheme extends ControlBase {
    /**
     * Loads the control and sets up state objects and event handlers.
     */
    async loadAsync(): Promise<void> {
        // SystemScheme has no states, thus we don't use it at all
    }
}
