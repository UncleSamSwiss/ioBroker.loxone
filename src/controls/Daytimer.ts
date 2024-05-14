import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class Daytimer extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'timer',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'mode',
            'override',
            'value',
            'needsActivation',
            'modeList',
            'entriesAndDefaultValue',
            'resetActive',
        ]);

        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'mode', 'number', 'value');
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'override',
            'number',
            'value',
            { unit: 'sec' },
        );

        // value is a number for analog daytimers and a boolean for digital ones
        if (control.details.analog) {
            await this.createSimpleControlStateObjectAsync(
                control.name,
                uuid,
                control.states,
                'value',
                'number',
                'value',
            );

            if (control.details.hasOwnProperty('format')) {
                await this.updateStateObjectAsync(
                    uuid + '.value-formatted',
                    {
                        name: control.name + ': formatted value',
                        read: true,
                        write: false,
                        type: 'string',
                        role: 'text',
                        // TODO: re-add: smartIgnore: true,
                    },
                    control.states.value,
                    async (name: string, value: any) => {
                        await this.setFormattedStateAck(name, value, control.details.format as string);
                    },
                );
            }
        } else {
            await this.createSimpleControlStateObjectAsync(
                control.name,
                uuid,
                control.states,
                'value',
                'boolean',
                'indicator',
            );

            if (control.details.hasOwnProperty('text')) {
                const text = control.details?.text as { on: string; off: string } | undefined;
                await this.updateStateObjectAsync(
                    uuid + '.value-formatted',
                    {
                        name: control.name + ': formatted value',
                        read: true,
                        write: false,
                        type: 'string',
                        role: 'text',
                        // TODO: re-add: smartIgnore: true,
                    },
                    control.states.value,
                    async (name: string, value: any) => {
                        await this.setStateAck(
                            name,
                            (this.convertStateToBoolean(value) ? text?.on : text?.off) || null,
                        );
                    },
                );
            }
        }

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'needsActivation',
            'boolean',
            'indicator',
        );

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'resetActive',
            'boolean',
            'indicator',
        );

        if (control.states.hasOwnProperty('mode') && control.states.hasOwnProperty('modeList')) {
            const obj: ioBroker.SettableObjectWorker<ioBroker.StateObject> = {
                type: 'state',
                common: {
                    name: control.name + ': mode as text',
                    read: true,
                    write: false,
                    type: 'string',
                    role: 'text',
                    // TODO: re-add: smartIgnore: true,
                },
                native: {
                    mode: control.states.mode,
                    modeList: control.states.modeList,
                },
            };
            await this.updateObjectAsync(uuid + '.mode-text', obj);

            let modeNames: Record<string, string> = {};
            let mode = '-';
            const updateModeText = async (): Promise<void> => {
                if (modeNames.hasOwnProperty(mode)) {
                    await this.setStateAck(uuid + '.mode-text', modeNames[mode]);
                }
            };
            this.addStateEventHandler(control.states.mode, async (value: ioBroker.StateValue) => {
                mode = this.convertStateToInt(value).toString();
                await updateModeText();
            });
            this.addStateEventHandler(control.states.modeList, async (value: ioBroker.StateValue) => {
                if (!value) {
                    return;
                }

                // format of value: 0:mode=0;name=\"Feiertag\",1:mode=1;name=\"Urlaub\"
                modeNames = value
                    .toString()
                    .split(',')
                    .map((item) =>
                        item
                            .split(':', 2)[1]
                            .split(';')
                            .map((pair) => pair.split('=', 2)),
                    )
                    .reduce(
                        (old, pairs) => {
                            const modePair = pairs.find((p) => p[0] === 'mode');
                            const namePair = pairs.find((p) => p[0] === 'name');
                            if (!modePair || !namePair) {
                                return old;
                            }
                            return { ...old, [modePair[1]]: namePair[1].replace(/^\\?"(.+?)\\?"$/g, '$1') };
                        },
                        {} as Record<string, string>,
                    );
                await updateModeText();
            });
        }

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'pulse');
        this.addStateChangeListener(
            uuid + '.pulse',
            () => {
                this.sendCommand(control.uuidAction, 'pulse');
            },
            { selfAck: true },
        );
    }
}
