import { LoxoneHandlerBase } from '../loxone-handler-base';
import { Loxone } from '../main';
import { Control } from '../structure-file';

export type ControlType = 'device' | 'channel';

export abstract class ControlBase extends LoxoneHandlerBase {
    constructor(protected readonly adapter: Loxone) {
        super(adapter);
    }

    abstract loadAsync(type: ControlType, uuid: string, control: Control): Promise<void>;
}
