"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightControllerV2 = void 0;
const control_base_1 = require("./control-base");
class LightControllerV2 extends control_base_1.ControlBase {
    constructor() {
        super(...arguments);
        this.activeMoods = [];
        this.favoriteMoods = [];
        this.additionalMoods = [];
        this.idToMoodName = {};
        this.moodNameToId = {};
        this.uuid = '';
    }
    async loadAsync(type, uuid, control) {
        this.uuid = uuid;
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'light',
            },
            native: { control: control },
        });
        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'activeMoods',
            'moodList',
            'favoriteMoods',
            'additionalMoods',
        ]);
        if (control.states.hasOwnProperty('activeMoods') &&
            control.states.hasOwnProperty('moodList') &&
            control.states.hasOwnProperty('favoriteMoods') &&
            control.states.hasOwnProperty('additionalMoods')) {
            await this.updateStateObjectAsync(uuid + '.moodList', {
                name: control.name + ': moodList',
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                // TODO: re-add: smartIgnore: true,
            }, control.states.moodList, async (name, value) => {
                const moodList = JSON.parse(value);
                const list = [];
                this.idToMoodName = {};
                this.moodNameToId = {};
                for (const index in moodList) {
                    const mood = moodList[index];
                    if (mood.hasOwnProperty('id') && mood.hasOwnProperty('name')) {
                        this.idToMoodName[mood.id] = mood.name;
                        this.moodNameToId[mood.name] = mood.id;
                        list.push(mood.name);
                    }
                }
                await this.updateActiveMoods();
                await this.updateFavoriteMoods();
                await this.updateAdditionalMoods();
                await this.setStateAck(name, JSON.stringify(list));
            });
            await this.updateStateObjectAsync(uuid + '.activeMoods', {
                name: control.name + ': activeMoods',
                read: true,
                write: true,
                type: 'array',
                role: 'list',
                // TODO: re-add: smartIgnore: true,
            }, control.states.activeMoods, async (name, value) => {
                this.activeMoods = JSON.parse(value);
                await this.updateActiveMoods();
            });
            this.addStateChangeListener(uuid + '.activeMoods', (oldValue, newValue) => {
                let arrayValue;
                if (Array.isArray(newValue)) {
                    arrayValue = newValue;
                }
                else {
                    try {
                        newValue = JSON.parse(newValue);
                    }
                    catch (e) {
                        // ignore error, continue below
                    }
                    if (!Array.isArray(newValue)) {
                        arrayValue = newValue.split(',');
                    }
                    else {
                        arrayValue = newValue;
                    }
                }
                const ids = [];
                for (let i = 0; i < arrayValue.length; i++) {
                    const moodName = arrayValue[i];
                    if (!this.moodNameToId.hasOwnProperty(moodName)) {
                        this.adapter.reportError(`Can't find mood name '${moodName}', discarding new value`);
                        return;
                    }
                    ids.push(this.moodNameToId[moodName]);
                }
                if (ids.length === 0) {
                    this.adapter.reportError(uuid + ".activeMoods can't have zero IDs, discarding new value");
                    return;
                }
                const addMoods = [];
                const removeMoods = [];
                let hasKeepMoods = false;
                for (let i = 0; i < ids.length; i++) {
                    if (this.activeMoods.includes(ids[i])) {
                        hasKeepMoods = true;
                    }
                    else {
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
                        this.sendCommand(control.uuidAction, 'removeMood/' + removeMoods[i]);
                    }
                }
                else {
                    const firstId = addMoods.shift();
                    this.sendCommand(control.uuidAction, 'changeTo/' + firstId);
                }
                for (let i = 0; i < addMoods.length; i++) {
                    this.sendCommand(control.uuidAction, 'addMood/' + addMoods[i]);
                }
            });
            await this.updateStateObjectAsync(uuid + '.favoriteMoods', {
                name: control.name + ': favoriteMoods',
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                // TODO: re-add: smartIgnore: true,
            }, control.states.favoriteMoods, async (id, value) => {
                this.favoriteMoods = JSON.parse(value);
                await this.updateFavoriteMoods();
            });
            await this.updateStateObjectAsync(uuid + '.additionalMoods', {
                name: control.name + ': additionalMoods',
                read: true,
                write: false,
                type: 'array',
                role: 'list',
                // TODO: re-add: smartIgnore: true,
            }, control.states.additionalMoods, async (name, value) => {
                this.additionalMoods = JSON.parse(value);
                await this.updateAdditionalMoods();
            });
        }
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'plus');
        this.addStateChangeListener(uuid + '.plus', () => {
            this.sendCommand(control.uuidAction, 'plus');
        });
        await this.createButtonCommandStateObjectAsync(control.name, uuid, 'minus');
        this.addStateChangeListener(uuid + '.minus', () => {
            this.sendCommand(control.uuidAction, 'minus');
        });
        // TODO: add Alexa support! (how???)
        // TODO: currently we don't support scene modifications ("learn" and "delete" commands),
        // IMHO this should be done by the user through the Loxone Web interface
        await this.loadSubControlsAsync(uuid, control);
    }
    async updateMoodsList(name, idList) {
        if (Object.keys(this.idToMoodName).length === 0) {
            return;
        }
        const list = [];
        for (const index in idList) {
            const id = idList[index];
            if (this.idToMoodName.hasOwnProperty(id)) {
                list.push(this.idToMoodName[id]);
            }
            else {
                list.push(id);
            }
        }
        await this.setStateAck(this.uuid + '.' + name, JSON.stringify(list));
    }
    async updateActiveMoods() {
        await this.updateMoodsList('activeMoods', this.activeMoods);
    }
    async updateFavoriteMoods() {
        await this.updateMoodsList('favoriteMoods', this.favoriteMoods);
    }
    async updateAdditionalMoods() {
        await this.updateMoodsList('additionalMoods', this.additionalMoods);
    }
}
exports.LightControllerV2 = LightControllerV2;
//# sourceMappingURL=LightControllerV2.js.map