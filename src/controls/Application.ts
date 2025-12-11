import { ControlBase } from './control-base';

/**
 * Handler for Application controls.
 */
export class Application extends ControlBase {
    /**
     * Loads the control and sets up state objects and event handlers.
     */
    async loadAsync(): Promise<void> {
        // Application has no states, thus we don't use it at all
    }
}
