import { CurrentStateValue, OldStateValue } from '../main';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class Gate extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'blind',
            },
            native: { control: control as any },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'position',
            'active',
            'preventOpen',
            'preventClose',
        ]);

        const activeStates = {
            '-1': 'close',
            '0': 'not moving',
            '1': 'open',
        };
        await this.createPercentageControlStateObjectAsync(control.name, uuid, control.states, 'position', 'level', {
            write: true,
            // TODO: re-add: smartIgnore: false,
        });
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'active',
            'number',
            'value',
            { write: true, states: activeStates },
        );
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'preventOpen', 'indicator');
        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'preventClose',
            'indicator',
        );

        this.addStateChangeListener(uuid + '.active', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            oldValue = this.convertStateToInt(oldValue);
            newValue = this.convertStateToInt(newValue);
            if (newValue === oldValue) {
                return;
            } else if (newValue === 1) {
                if (oldValue === -1) {
                    // open twice because we are currently closing
                    this.sendCommand(control.uuidAction, 'open');
                }
                this.sendCommand(control.uuidAction, 'open');
            } else if (newValue === -1) {
                if (oldValue === 1) {
                    // close twice because we are currently opening
                    this.sendCommand(control.uuidAction, 'close');
                }
                this.sendCommand(control.uuidAction, 'close');
            } else if (newValue === 0) {
                if (oldValue === 1) {
                    this.sendCommand(control.uuidAction, 'close');
                } else if (oldValue === -1) {
                    this.sendCommand(control.uuidAction, 'open');
                }
            }
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'open');
        this.addStateChangeListener(uuid + '.open', () => {
            this.sendCommand(control.uuidAction, 'open');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'close');
        this.addStateChangeListener(uuid + '.close', () => {
            this.sendCommand(control.uuidAction, 'close');
        });

        // for Alexa support:
        if (control.states.position) {
            this.addStateChangeListener(uuid + '.position', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                newValue = Math.max(0, Math.min(100, this.convertStateToInt(newValue))); // 0 <= newValue <= 100
                oldValue = this.convertStateToInt(oldValue);
                if (oldValue == newValue) {
                    return;
                }

                let targetValue: number;
                let isOpening: boolean;
                if (oldValue < newValue) {
                    targetValue = (newValue - 1) / 100;
                    this.sendCommand(control.uuidAction, 'open');
                    isOpening = true;
                } else {
                    targetValue = (newValue + 1) / 100;
                    this.sendCommand(control.uuidAction, 'close');
                    isOpening = false;
                }

                if (newValue == 100 || newValue === 0) {
                    return;
                }

                const listenerName = 'auto';
                this.addStateEventHandler(
                    control.states.position,
                    (value: any) => {
                        if (isOpening && value >= targetValue) {
                            this.removeStateEventHandler(control.states.position, listenerName);
                            this.sendCommand(control.uuidAction, 'close');
                        } else if (!isOpening && value <= targetValue) {
                            this.removeStateEventHandler(control.states.position, listenerName);
                            this.sendCommand(control.uuidAction, 'open');
                        }
                    },
                    listenerName,
                );
            });
        }
    }
}
