import { CurrentStateValue, OldStateValue } from '../main';
import { ControlBase, ControlType } from './ControlBase';

export class AudioZone extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: any): Promise<void> {
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'media.music',
            },
            native: control,
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'serverState',
            'playState',
            'clientState',
            'power',
            'volume',
            'maxVolume',
            'volumeStep',
            'shuffle',
            'sourceList',
            'repeat',
            'songName',
            'duration',
            'progress',
            'album',
            'artist',
            'station',
            'genre',
            'cover',
            'source',
        ]);

        const serverStates = {
            '-3': 'invalid zone',
            '-2': 'not reachable',
            '-1': 'unknown',
            '0': 'offline',
            '1': 'initializing',
            '2': 'online',
        };
        const playStates = {
            '-1': 'unknown',
            '0': 'stopped',
            '1': 'paused',
            '2': 'playing',
        };
        const clientStates = {
            '0': 'offline',
            '1': 'initializing',
            '2': 'online',
        };
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'serverState',
            'number',
            'value',
            { states: serverStates },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'playState',
            'number',
            'value',
            { write: true, states: playStates },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'clientState',
            'number',
            'value',
            { states: clientStates },
        );
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'power', 'switch', {
            write: true,
            smartIgnore: false,
        });
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'volume',
            'number',
            'level.volume',
            { write: true },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'maxVolume',
            'number',
            'value',
        );
        await this.createBooleanControlStateObjectAsync(control.name, uuid, control.states, 'shuffle', 'switch', {
            write: true,
        });
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'sourceList',
            'string',
            'json',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'repeat',
            'number',
            'value',
            { write: true },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'songName',
            'string',
            'text',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'duration',
            'number',
            'value.interval',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'progress',
            'number',
            'value.interval',
            { write: true },
        );
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'album', 'string', 'text');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'artist', 'string', 'text');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'station', 'string', 'text');
        await this.createSimpleControlStateObjectAsync(control.name, uuid, control.states, 'genre', 'string', 'text');
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'cover',
            'string',
            'text.url',
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'source',
            'number',
            'value',
            { write: true },
        );

        this.addStateChangeListener(uuid + '.playState', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            newValue = this.convertStateToInt(newValue);
            if (newValue === 0 || newValue === 1) {
                this.sendCommand(control.uuidAction, 'pause');
            } else if (newValue === 2) {
                this.sendCommand(control.uuidAction, 'play');
            }
        });
        this.addStateChangeListener(uuid + '.power', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, newValue ? 'on' : 'off');
        });
        this.addStateChangeListener(uuid + '.volume', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'volume/' + newValue);
        });
        this.addStateChangeListener(uuid + '.shuffle', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'shuffle/' + (newValue ? 1 : 0));
        });
        this.addStateChangeListener(uuid + '.repeat', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'repeat/' + newValue);
        });
        this.addStateChangeListener(uuid + '.progress', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'progress/' + newValue);
        });
        this.addStateChangeListener(uuid + '.source', (oldValue: OldStateValue, newValue: CurrentStateValue) => {
            this.sendCommand(control.uuidAction, 'source/' + newValue);
        });

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'prev');
        this.addStateChangeListener(uuid + '.prev', () => {
            this.sendCommand(control.uuidAction, 'prev');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'next');
        this.addStateChangeListener(uuid + '.next', () => {
            this.sendCommand(control.uuidAction, 'next');
        });
    }
}
