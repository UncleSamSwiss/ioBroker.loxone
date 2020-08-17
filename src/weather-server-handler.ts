import { sprintf } from 'sprintf-js';
import { LoxoneHandlerBase } from './loxone-handler-base';
import { Loxone } from './main';
import { Format, WeatherServer } from './structure-file';

export class WeatherServerHandler extends LoxoneHandlerBase {
    private readonly deviceName = 'WeatherServer';
    private format!: Format;
    private weatherTypeTexts: Record<string, string> = {};
    private forecastChannelsCount = 0;

    public constructor(protected readonly adapter: Loxone) {
        super(adapter);
    }

    public async loadAsync(data: WeatherServer): Promise<void> {
        if (data === undefined || !data.hasOwnProperty('states') || !data.states.hasOwnProperty('actual')) {
            return;
        }

        this.format = data.format;
        this.weatherTypeTexts = data.weatherTypeTexts;

        const deviceName = 'WeatherServer';
        await this.updateObjectAsync(deviceName, {
            type: 'device',
            common: {
                name: deviceName,
                role: 'weather',
            },
            native: { data: data as any },
        });

        await this.setWeatherObjectsAsync('Actual');

        this.addStateEventHandler(data.states.actual, (value: any) => {
            this.setWeatherStates(deviceName + '.Actual', value.entry[0]);
        });

        this.addStateEventHandler(data.states.forecast, async (value: any) => {
            for (let i = 0; i < value.entry.length; i++) {
                const channelName = 'Hour' + sprintf('%02d', i + 1);
                if (i >= this.forecastChannelsCount) {
                    await this.setWeatherObjectsAsync(channelName);
                    this.forecastChannelsCount++;
                }

                this.setWeatherStates(deviceName + '.' + channelName, value.entry[i]);
            }
        });
    }

    private setWeatherStates(parent: string, values: any): void {
        if (values === undefined) {
            return;
        }

        this.setStateAck(parent + '.barometricPressure', values.barometricPressure);
        this.setFormattedStateAck(
            parent + '.barometricPressure-formatted',
            values.barometricPressure,
            this.format.barometricPressure,
        );
        this.setStateAck(parent + '.dewPoint', values.dewPoint);
        this.setFormattedStateAck(parent + '.dewPoint-formatted', values.dewPoint, this.format.temperature);
        this.setStateAck(parent + '.perceivedTemperature', values.perceivedTemperature);
        this.setFormattedStateAck(
            parent + '.perceivedTemperature-formatted',
            values.perceivedTemperature,
            this.format.temperature,
        );
        this.setStateAck(parent + '.precipitation', values.precipitation);
        this.setFormattedStateAck(parent + '.precipitation-formatted', values.precipitation, this.format.precipitation);
        this.setStateAck(parent + '.relativeHumidity', values.relativeHumidity);
        this.setFormattedStateAck(
            parent + '.relativeHumidity-formatted',
            values.relativeHumidity,
            this.format.relativeHumidity,
        );
        this.setStateAck(parent + '.solarRadiation', values.solarRadiation);
        this.setStateAck(parent + '.temperature', values.temperature);
        this.setFormattedStateAck(parent + '.temperature-formatted', values.temperature, this.format.temperature);
        this.setTimeStateAck(parent + '.timestamp', values.timestamp);
        this.setStateAck(parent + '.weatherType', values.weatherType);
        this.setStateAck(parent + '.weatherType-text', this.weatherTypeTexts[values.weatherType]);
        this.setStateAck(parent + '.windDirection', values.windDirection);
        this.setStateAck(parent + '.windSpeed', values.windSpeed);
        this.setFormattedStateAck(parent + '.windSpeed-formatted', values.windSpeed, this.format.windSpeed);
    }

    private setTimeStateAck(id: string, miniserverTime: number): void {
        const value = miniserverTime * 1000 + new Date(2009, 0, 1).getTime();
        this.setStateAck(id, value);
    }

    private async setWeatherObjectsAsync(channelName: string): Promise<void> {
        await this.updateObjectAsync(this.deviceName + '.' + channelName, {
            type: 'channel',
            common: {
                name: channelName,
                role: 'weather.current',
            },
            native: {},
        });

        await this.setWeatherObjectAsync(
            channelName,
            'barometricPressure',
            channelName + ': Barometric pressure',
            'number',
            'value',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'barometricPressure-formatted',
            channelName + ': Barometric pressure: formatted',
            'string',
            'text',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'dewPoint',
            channelName + ': Dew point',
            'number',
            'value.temperature',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'dewPoint-formatted',
            channelName + ': Dew point: formatted',
            'string',
            'text',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'perceivedTemperature',
            channelName + ': Perceived temperature',
            'number',
            'value.temperature',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'perceivedTemperature-formatted',
            channelName + ': Perceived temperature: formatted',
            'string',
            'text',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'precipitation',
            channelName + ': Precipitation',
            'number',
            'value',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'precipitation-formatted',
            channelName + ': Precipitation: formatted',
            'string',
            'text',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'relativeHumidity',
            channelName + ': Relative humidity',
            'number',
            'value.humidity',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'relativeHumidity-formatted',
            channelName + ': Relative humidity: formatted',
            'string',
            'text',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'solarRadiation',
            channelName + ': Solar radiation',
            'number',
            'value',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'temperature',
            channelName + ': Temperature',
            'number',
            'value.temperature',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'temperature-formatted',
            channelName + ': Temperature: formatted',
            'string',
            'text',
        );
        await this.setWeatherObjectAsync(channelName, 'timestamp', channelName + ': Timestamp', 'number', 'value.time');
        await this.setWeatherObjectAsync(channelName, 'weatherType', channelName + ': Weather type', 'number', 'value');
        await this.setWeatherObjectAsync(
            channelName,
            'weatherType-text',
            channelName + ': Weather type: text',
            'string',
            'text',
        );
        await this.setWeatherObjectAsync(
            channelName,
            'windDirection',
            channelName + ': Wind direction',
            'number',
            'value',
        );
        await this.setWeatherObjectAsync(channelName, 'windSpeed', channelName + ': Wind speed', 'number', 'value');
        await this.setWeatherObjectAsync(
            channelName,
            'windSpeed-formatted',
            channelName + ': Wind speed: formatted',
            'string',
            'text',
        );
    }

    private async setWeatherObjectAsync(
        channelName: string,
        id: string,
        name: string,
        type: ioBroker.CommonType,
        role: string,
    ): Promise<void> {
        await this.updateObjectAsync(this.deviceName + '.' + channelName + '.' + id, {
            type: 'state',
            common: {
                name: name,
                read: true,
                write: false,
                type: type,
                role: role,
            },
            native: {},
        });
    }
}
