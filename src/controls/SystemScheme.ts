import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class SystemScheme extends ControlBase {
    async loadAsync(_type: ControlType, _uuid: string, _control: Control): Promise<void> {
        // SystemScheme has no states, thus we don't use it at all
    }
}
