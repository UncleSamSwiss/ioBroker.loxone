import { ControlBase, ControlType } from './ControlBase';

export class WindowMonitor extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: control,
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'windowStates',
            'numOpen',
            'numClosed',
            'numTilted',
            'numOffline',
            'numLocked',
            'numUnlocked',
        ]);

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'numOpen',
            'number',
            'value',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'numClosed',
            'number',
            'value',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'numTilted',
            'number',
            'value',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'numOffline',
            'number',
            'value',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'numLocked',
            'number',
            'value',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'numUnlocked',
            'number',
            'value',
        );

        if (
            !control.hasOwnProperty('details') ||
            !control.details.hasOwnProperty('windows') ||
            !control.states.hasOwnProperty('windowStates')
        ) {
            return;
        }
        const windowPositions: Record<number, string> = {
            1: 'closed',
            2: 'tilted',
            4: 'open',
            8: 'locked',
            16: 'unlocked',
        };
        for (const index in control.details.windows) {
            const window = control.details.windows[index];
            const id = uuid + '.' + (parseInt(index) + 1);
            await this.updateObjectAsync(id, {
                type: 'channel',
                common: {
                    name: control.name + ': ' + window.name,
                    role: 'sensor.window.3',
                    smartIgnore: true,
                } as any, // TODO: fix this, shouldn't be "any"
                native: window,
            });
            for (let mask = 1; mask <= 16; mask *= 2) {
                const windowPosition = windowPositions[mask];
                const obj: ioBroker.PartialStateObject = {
                    type: 'state',
                    common: {
                        name: control.name + ': ' + window.name + ': ' + windowPosition,
                        read: true,
                        write: false,
                        type: 'boolean',
                        role: 'indicator',
                        smartIgnore: true,
                    } as any, // TODO: fix this, shouldn't be "any"
                    native: {},
                };
                await this.updateObjectAsync(id + '.' + windowPosition, obj);
            }
        }

        this.addStateEventHandler(control.states.windowStates, (value: any) => {
            const values = value.toString().split(',');
            for (const index in values) {
                for (let mask = 1; mask <= 16; mask *= 2) {
                    const windowPosition = windowPositions[mask];
                    this.setStateAck(
                        uuid + '.' + (parseInt(index) + 1) + '.' + windowPosition,
                        (parseInt(values[index]) & mask) == mask,
                    );
                }
            }
        });
    }
}
