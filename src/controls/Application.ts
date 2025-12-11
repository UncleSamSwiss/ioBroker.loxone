import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class Application extends ControlBase {
    async loadAsync(_type: ControlType, _uuid: string, _control: Control): Promise<void> {
        // Application has no states, thus we don't use it at all
    }
}
