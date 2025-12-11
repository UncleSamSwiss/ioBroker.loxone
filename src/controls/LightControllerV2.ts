import type { CurrentStateValue, OldStateValue } from '../main';
import type { Control } from '../structure-file';
import type { ControlType } from './control-base';
import { ControlBase } from './control-base';

export class LightControllerV2 extends ControlBase {
    private activeMoods: string[] = [];
    private favoriteMoods: string[] = [];
    private additionalMoods: string[] = [];

    private idToMoodName: Record<string, string> = {};
    private moodNameToId: Record<string, string> = {};

    private uuid = '';

    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        this.uuid = uuid;
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'activeMoods',
            'moodList',
            'favoriteMoods',
            'additionalMoods',
        ]);

        if (
            'activeMoods' in control.states &&
            'moodList' in control.states &&
            'favoriteMoods' in control.states &&
            'additionalMoods' in control.states
        ) {
            await this.updateStateObjectAsync(
                `${uuid}.moodList`,
                {
                    name: `${control.name}: moodList`,
                    read: true,
                    write: false,
                    type: 'array',
                    role: 'list',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.moodList,
                async (name: string, value: any) => {
                    const moodList = JSON.parse(value);
                    const list = [];
                    this.idToMoodName = {};
                    this.moodNameToId = {};
                    for (const index in moodList) {
                        const mood = moodList[index];
                        if ('id' in mood && 'name' in mood) {
                            this.idToMoodName[mood.id] = mood.name;
                            this.moodNameToId[mood.name] = mood.id;
                            list.push(mood.name);
                        }
                    }
                    await this.updateActiveMoods();
                    await this.updateFavoriteMoods();
                    await this.updateAdditionalMoods();

                    await this.setStateAck(name, JSON.stringify(list));
                },
            );
            await this.updateStateObjectAsync(
                `${uuid}.activeMoods`,
                {
                    name: `${control.name}: activeMoods`,
                    read: true,
                    write: true,
                    type: 'array',
                    role: 'list',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.activeMoods,
                async (name: string, value: any) => {
                    this.activeMoods = JSON.parse(value);
                    await this.updateActiveMoods();
                },
            );
            this.addStateChangeListener(
                `${uuid}.activeMoods`,
                (oldValue: OldStateValue, newValue: CurrentStateValue) => {
                    let arrayValue: string[];
                    if (Array.isArray(newValue)) {
                        arrayValue = newValue;
                    } else {
                        try {
                            newValue = JSON.parse(newValue as string);
                        } catch {
                            // ignore error, continue below
                        }
                        if (!Array.isArray(newValue)) {
                            arrayValue = (newValue as string).split(',');
                        } else {
                            arrayValue = newValue;
                        }
                    }

                    const ids = [];
                    for (let i = 0; i < arrayValue.length; i++) {
                        const moodName = arrayValue[i];
                        if (!(moodName in this.moodNameToId)) {
                            this.adapter.reportError(`Can't find mood name '${moodName}', discarding new value`);
                            return;
                        }
                        ids.push(this.moodNameToId[moodName]);
                    }
                    if (ids.length === 0) {
                        this.adapter.reportError(`${uuid}.activeMoods can't have zero IDs, discarding new value`);
                        return;
                    }

                    const addMoods = [];
                    const removeMoods = [];
                    let hasKeepMoods = false;
                    for (let i = 0; i < ids.length; i++) {
                        if (this.activeMoods.includes(ids[i])) {
                            hasKeepMoods = true;
                        } else {
                            addMoods.push(ids[i]);
                        }
                    }
                    for (let i = 0; i < this.activeMoods.length; i++) {
                        if (!ids.includes(this.activeMoods[i])) {
                            removeMoods.push(this.activeMoods[i]);
                        }
                    }
                    if (hasKeepMoods) {
                        for (let i = 0; i < removeMoods.length; i++) {
                            this.sendCommand(control.uuidAction, `removeMood/${removeMoods[i]}`);
                        }
                    } else {
                        const firstId = addMoods.shift();
                        this.sendCommand(control.uuidAction, `changeTo/${firstId}`);
                    }

                    for (let i = 0; i < addMoods.length; i++) {
                        this.sendCommand(control.uuidAction, `addMood/${addMoods[i]}`);
                    }
                },
            );
            await this.updateStateObjectAsync(
                `${uuid}.favoriteMoods`,
                {
                    name: `${control.name}: favoriteMoods`,
                    read: true,
                    write: false,
                    type: 'array',
                    role: 'list',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.favoriteMoods,
                async (id: string, value: any) => {
                    this.favoriteMoods = JSON.parse(value);
                    await this.updateFavoriteMoods();
                },
            );
            await this.updateStateObjectAsync(
                `${uuid}.additionalMoods`,
                {
                    name: `${control.name}: additionalMoods`,
                    read: true,
                    write: false,
                    type: 'array',
                    role: 'list',
                    // TODO: re-add: smartIgnore: true,
                },
                control.states.additionalMoods,
                async (name: string, value: any) => {
                    this.additionalMoods = JSON.parse(value);
                    await this.updateAdditionalMoods();
                },
            );
        }

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'plus');
        this.addStateChangeListener(
            `${uuid}.plus`,
            () => {
                this.sendCommand(control.uuidAction, 'plus');
            },
            { selfAck: true },
        );

        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'minus');
        this.addStateChangeListener(
            `${uuid}.minus`,
            () => {
                this.sendCommand(control.uuidAction, 'minus');
            },
            { selfAck: true },
        );

        // TODO: add Alexa support! (how???)

        // TODO: currently we don't support scene modifications ("learn" and "delete" commands),
        // IMHO this should be done by the user through the Loxone Web interface

        await this.loadSubControlsAsync(uuid, control);
    }

    private async updateMoodsList(name: string, idList: string[]): Promise<void> {
        if (Object.keys(this.idToMoodName).length === 0) {
            return;
        }
        const list = [];
        for (const id of idList) {
            if (id in this.idToMoodName) {
                list.push(this.idToMoodName[id]);
            } else {
                list.push(id);
            }
        }

        await this.setStateAck(`${this.uuid}.${name}`, JSON.stringify(list));
    }

    private async updateActiveMoods(): Promise<void> {
        await this.updateMoodsList('activeMoods', this.activeMoods);
    }

    private async updateFavoriteMoods(): Promise<void> {
        await this.updateMoodsList('favoriteMoods', this.favoriteMoods);
    }

    private async updateAdditionalMoods(): Promise<void> {
        await this.updateMoodsList('additionalMoods', this.additionalMoods);
    }
}
