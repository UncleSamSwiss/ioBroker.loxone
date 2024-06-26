import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

export class Fronius extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        const systemConfig = await this.adapter.getForeignObjectAsync('system.config');
        // @ts-expect-error fixed in next js-controller
        const currency = systemConfig?.common.currency;
        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: control.name,
                role: 'sensor',
            },
            native: { control },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, [
            'prodCurr',
            'prodCurrDay',
            'prodCurrMonth',
            'prodCurrYear',
            'prodTotal',
            'consCurr',
            'consCurrDay',
            'consTotal',
            'deliveryDay',
            'earningsDay',
            'earningsMonth',
            'earningsYear',
            'earningsTotal',
            'gridCurr',
            'batteryCurr',
            'stateOfCharge',
            'priceDelivery',
            'priceConsumption',
            'co2Factor',
            'generatorType',
            'mode',
            'online',
        ]);
        // note: priceDelivery, priceConsumption, generatorType and mode are ignored
        // because they represent static data that is of no use to ioBroker

        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'prodCurr',
            'number',
            'value',
            { unit: 'kW' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'prodCurrDay',
            'number',
            'value',
            { unit: 'kWh' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'prodCurrMonth',
            'number',
            'value',
            { unit: 'kWh' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'prodCurrYear',
            'number',
            'value',
            { unit: 'kWh' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'prodTotal',
            'number',
            'value',
            { unit: 'kWh' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'consCurr',
            'number',
            'value',
            { unit: 'kW' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'consCurrDay',
            'number',
            'value.power.consumption',
            { unit: 'kWh' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'consTotal',
            'number',
            'value.power.consumption',
            { unit: 'kWh' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'gridCurr',
            'number',
            'value',
            { unit: 'kW' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'batteryCurr',
            'number',
            'value',
            { unit: 'kW' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'stateOfCharge',
            'number',
            'value',
            { unit: '%' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'deliveryDay',
            'number',
            'value',
            { unit: 'kWh' },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'earningsDay',
            'number',
            'value',
            { unit: currency },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'earningsMonth',
            'number',
            'value',
            { unit: currency },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'earningsYear',
            'number',
            'value',
            { unit: currency },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'earningsTotal',
            'number',
            'value',
            { unit: currency },
        );
        await this.createSimpleControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'co2Factor',
            'number',
            'value',
        );
        await this.createBooleanControlStateObjectAsync(
            control.name,
            uuid,
            control.states,
            'online',
            'indicator.reachable',
            {},
            (value) => value != 1, // according to docs: 0 = online, 1 = offline
        );
    }
}
