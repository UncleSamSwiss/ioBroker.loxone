import { LoxoneHandlerBase } from '../loxone-handler-base';
import { Loxone } from '../main';

export type ControlType = 'device' | 'channel';

export abstract class ControlBase extends LoxoneHandlerBase {
    protected constructor(protected readonly adapter: Loxone) {
        super(adapter);
    }

    abstract loadAsync(type: ControlType, uuid: string, control: any): Promise<void>;
}
