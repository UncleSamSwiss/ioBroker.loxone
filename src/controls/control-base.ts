import { LoxoneHandlerBase } from '../loxone-handler-base';
import type { Loxone } from '../main';
import type { Control } from '../structure-file';

export type ControlType = 'device' | 'channel';

/**
 * Base class for all control handlers.
 */
export abstract class ControlBase extends LoxoneHandlerBase {
    /**
     * Creates an instance of this class.
     *
     * @param adapter The Loxone adapter instance.
     */
    constructor(protected readonly adapter: Loxone) {
        super(adapter);
    }

    /**
     * Loads the control and sets up state objects and event handlers.
     *
     * @param type The type of the control ('device' or 'channel').
     * @param uuid The unique identifier of the control.
     * @param control The control data from the structure file.
     */
    abstract loadAsync(type: ControlType, uuid: string, control: Control): Promise<void>;
}
