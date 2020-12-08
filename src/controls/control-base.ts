import { LoxoneHandlerBase } from '../loxone-handler-base';
import { Loxone } from '../main';
import { Control } from '../structure-file';

export type ControlType = 'device' | 'channel';

export abstract class ControlBase extends LoxoneHandlerBase {
    protected constructor(protected readonly adapter: Loxone) {
        super(adapter);
    }

    abstract loadAsync(type: ControlType, uuid: string, control: Control): Promise<void>;

    protected resolvedPromise(): ioBroker.SetStatePromise {
        return Promise.resolve('Nothing to do');
    }
}
