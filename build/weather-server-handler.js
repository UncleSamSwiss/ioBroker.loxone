"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherServerHandler = void 0;
const sprintf_js_1 = require("sprintf-js");
const loxone_handler_base_1 = require("./loxone-handler-base");
class WeatherServerHandler extends loxone_handler_base_1.LoxoneHandlerBase {
    constructor(adapter) {
        super(adapter);
        this.adapter = adapter;
        this.deviceName = 'WeatherServer';
        this.weatherTypeTexts = {};
        this.forecastChannelsCount = 0;
    }
    async loadAsync(data) {
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
            native: { data: data },
        });
        await this.setWeatherObjectsAsync('Actual');
        this.addStateEventHandler(data.states.actual, async (value) => {
            await this.setWeatherStates(deviceName + '.Actual', value.entry[0]);
        });
        this.addStateEventHandler(data.states.forecast, async (value) => {
            for (let i = 0; i < value.entry.length; i++) {
                const channelName = 'Hour' + sprintf_js_1.sprintf('%02d', i + 1);
                if (i >= this.forecastChannelsCount) {
                    await this.setWeatherObjectsAsync(channelName);
                    this.forecastChannelsCount++;
                }
                await this.setWeatherStates(deviceName + '.' + channelName, value.entry[i]);
            }
        });
    }
    async setWeatherStates(parent, values) {
        if (values === undefined) {
            return;
        }
        await this.setStateAck(parent + '.barometricPressure', values.barometricPressure);
        await this.setFormattedStateAck(parent + '.barometricPressure-formatted', values.barometricPressure, this.format.barometricPressure);
        await this.setStateAck(parent + '.dewPoint', values.dewPoint);
        await this.setFormattedStateAck(parent + '.dewPoint-formatted', values.dewPoint, this.format.temperature);
        await this.setStateAck(parent + '.perceivedTemperature', values.perceivedTemperature);
        await this.setFormattedStateAck(parent + '.perceivedTemperature-formatted', values.perceivedTemperature, this.format.temperature);
        await this.setStateAck(parent + '.precipitation', values.precipitation);
        await this.setFormattedStateAck(parent + '.precipitation-formatted', values.precipitation, this.format.precipitation);
        await this.setStateAck(parent + '.relativeHumidity', values.relativeHumidity);
        await this.setFormattedStateAck(parent + '.relativeHumidity-formatted', values.relativeHumidity, this.format.relativeHumidity);
        await this.setStateAck(parent + '.solarRadiation', values.solarRadiation);
        await this.setStateAck(parent + '.temperature', values.temperature);
        await this.setFormattedStateAck(parent + '.temperature-formatted', values.temperature, this.format.temperature);
        await this.setTimeStateAck(parent + '.timestamp', values.timestamp);
        await this.setStateAck(parent + '.weatherType', values.weatherType);
        await this.setStateAck(parent + '.weatherType-text', this.weatherTypeTexts[values.weatherType]);
        await this.setStateAck(parent + '.windDirection', values.windDirection);
        await this.setStateAck(parent + '.windSpeed', values.windSpeed);
        await this.setFormattedStateAck(parent + '.windSpeed-formatted', values.windSpeed, this.format.windSpeed);
    }
    async setTimeStateAck(id, miniserverTime) {
        const value = miniserverTime * 1000 + new Date(2009, 0, 1).getTime();
        await this.setStateAck(id, value);
    }
    async setWeatherObjectsAsync(channelName) {
        await this.updateObjectAsync(this.deviceName + '.' + channelName, {
            type: 'channel',
            common: {
                name: channelName,
                role: 'weather.current',
            },
            native: {},
        });
        await this.setWeatherObjectAsync(channelName, 'barometricPressure', channelName + ': Barometric pressure', 'number', 'value');
        await this.setWeatherObjectAsync(channelName, 'barometricPressure-formatted', channelName + ': Barometric pressure: formatted', 'string', 'text');
        await this.setWeatherObjectAsync(channelName, 'dewPoint', channelName + ': Dew point', 'number', 'value.temperature');
        await this.setWeatherObjectAsync(channelName, 'dewPoint-formatted', channelName + ': Dew point: formatted', 'string', 'text');
        await this.setWeatherObjectAsync(channelName, 'perceivedTemperature', channelName + ': Perceived temperature', 'number', 'value.temperature');
        await this.setWeatherObjectAsync(channelName, 'perceivedTemperature-formatted', channelName + ': Perceived temperature: formatted', 'string', 'text');
        await this.setWeatherObjectAsync(channelName, 'precipitation', channelName + ': Precipitation', 'number', 'value');
        await this.setWeatherObjectAsync(channelName, 'precipitation-formatted', channelName + ': Precipitation: formatted', 'string', 'text');
        await this.setWeatherObjectAsync(channelName, 'relativeHumidity', channelName + ': Relative humidity', 'number', 'value.humidity');
        await this.setWeatherObjectAsync(channelName, 'relativeHumidity-formatted', channelName + ': Relative humidity: formatted', 'string', 'text');
        await this.setWeatherObjectAsync(channelName, 'solarRadiation', channelName + ': Solar radiation', 'number', 'value');
        await this.setWeatherObjectAsync(channelName, 'temperature', channelName + ': Temperature', 'number', 'value.temperature');
        await this.setWeatherObjectAsync(channelName, 'temperature-formatted', channelName + ': Temperature: formatted', 'string', 'text');
        await this.setWeatherObjectAsync(channelName, 'timestamp', channelName + ': Timestamp', 'number', 'value.time');
        await this.setWeatherObjectAsync(channelName, 'weatherType', channelName + ': Weather type', 'number', 'value');
        await this.setWeatherObjectAsync(channelName, 'weatherType-text', channelName + ': Weather type: text', 'string', 'text');
        await this.setWeatherObjectAsync(channelName, 'windDirection', channelName + ': Wind direction', 'number', 'value');
        await this.setWeatherObjectAsync(channelName, 'windSpeed', channelName + ': Wind speed', 'number', 'value');
        await this.setWeatherObjectAsync(channelName, 'windSpeed-formatted', channelName + ': Wind speed: formatted', 'string', 'text');
    }
    async setWeatherObjectAsync(channelName, id, name, type, role) {
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
exports.WeatherServerHandler = WeatherServerHandler;
//# sourceMappingURL=weather-server-handler.js.map