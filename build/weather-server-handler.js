"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    loadAsync(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data === undefined || !data.hasOwnProperty('states') || !data.states.hasOwnProperty('actual')) {
                return;
            }
            this.format = data.format;
            this.weatherTypeTexts = data.weatherTypeTexts;
            const deviceName = 'WeatherServer';
            yield this.updateObjectAsync(deviceName, {
                type: 'device',
                common: {
                    name: deviceName,
                    role: 'weather',
                },
                native: { data: data },
            });
            yield this.setWeatherObjectsAsync('Actual');
            this.addStateEventHandler(data.states.actual, (value) => __awaiter(this, void 0, void 0, function* () {
                yield this.setWeatherStates(deviceName + '.Actual', value.entry[0]);
            }));
            this.addStateEventHandler(data.states.forecast, (value) => __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < value.entry.length; i++) {
                    const channelName = 'Hour' + sprintf_js_1.sprintf('%02d', i + 1);
                    if (i >= this.forecastChannelsCount) {
                        yield this.setWeatherObjectsAsync(channelName);
                        this.forecastChannelsCount++;
                    }
                    yield this.setWeatherStates(deviceName + '.' + channelName, value.entry[i]);
                }
            }));
        });
    }
    setWeatherStates(parent, values) {
        return __awaiter(this, void 0, void 0, function* () {
            if (values === undefined) {
                return;
            }
            yield this.setStateAck(parent + '.barometricPressure', values.barometricPressure);
            yield this.setFormattedStateAck(parent + '.barometricPressure-formatted', values.barometricPressure, this.format.barometricPressure);
            yield this.setStateAck(parent + '.dewPoint', values.dewPoint);
            yield this.setFormattedStateAck(parent + '.dewPoint-formatted', values.dewPoint, this.format.temperature);
            yield this.setStateAck(parent + '.perceivedTemperature', values.perceivedTemperature);
            yield this.setFormattedStateAck(parent + '.perceivedTemperature-formatted', values.perceivedTemperature, this.format.temperature);
            yield this.setStateAck(parent + '.precipitation', values.precipitation);
            yield this.setFormattedStateAck(parent + '.precipitation-formatted', values.precipitation, this.format.precipitation);
            yield this.setStateAck(parent + '.relativeHumidity', values.relativeHumidity);
            yield this.setFormattedStateAck(parent + '.relativeHumidity-formatted', values.relativeHumidity, this.format.relativeHumidity);
            yield this.setStateAck(parent + '.solarRadiation', values.solarRadiation);
            yield this.setStateAck(parent + '.temperature', values.temperature);
            yield this.setFormattedStateAck(parent + '.temperature-formatted', values.temperature, this.format.temperature);
            yield this.setTimeStateAck(parent + '.timestamp', values.timestamp);
            yield this.setStateAck(parent + '.weatherType', values.weatherType);
            yield this.setStateAck(parent + '.weatherType-text', this.weatherTypeTexts[values.weatherType]);
            yield this.setStateAck(parent + '.windDirection', values.windDirection);
            yield this.setStateAck(parent + '.windSpeed', values.windSpeed);
            yield this.setFormattedStateAck(parent + '.windSpeed-formatted', values.windSpeed, this.format.windSpeed);
        });
    }
    setTimeStateAck(id, miniserverTime) {
        return __awaiter(this, void 0, void 0, function* () {
            const value = miniserverTime * 1000 + new Date(2009, 0, 1).getTime();
            yield this.setStateAck(id, value);
        });
    }
    setWeatherObjectsAsync(channelName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(this.deviceName + '.' + channelName, {
                type: 'channel',
                common: {
                    name: channelName,
                    role: 'weather.current',
                },
                native: {},
            });
            yield this.setWeatherObjectAsync(channelName, 'barometricPressure', channelName + ': Barometric pressure', 'number', 'value');
            yield this.setWeatherObjectAsync(channelName, 'barometricPressure-formatted', channelName + ': Barometric pressure: formatted', 'string', 'text');
            yield this.setWeatherObjectAsync(channelName, 'dewPoint', channelName + ': Dew point', 'number', 'value.temperature');
            yield this.setWeatherObjectAsync(channelName, 'dewPoint-formatted', channelName + ': Dew point: formatted', 'string', 'text');
            yield this.setWeatherObjectAsync(channelName, 'perceivedTemperature', channelName + ': Perceived temperature', 'number', 'value.temperature');
            yield this.setWeatherObjectAsync(channelName, 'perceivedTemperature-formatted', channelName + ': Perceived temperature: formatted', 'string', 'text');
            yield this.setWeatherObjectAsync(channelName, 'precipitation', channelName + ': Precipitation', 'number', 'value');
            yield this.setWeatherObjectAsync(channelName, 'precipitation-formatted', channelName + ': Precipitation: formatted', 'string', 'text');
            yield this.setWeatherObjectAsync(channelName, 'relativeHumidity', channelName + ': Relative humidity', 'number', 'value.humidity');
            yield this.setWeatherObjectAsync(channelName, 'relativeHumidity-formatted', channelName + ': Relative humidity: formatted', 'string', 'text');
            yield this.setWeatherObjectAsync(channelName, 'solarRadiation', channelName + ': Solar radiation', 'number', 'value');
            yield this.setWeatherObjectAsync(channelName, 'temperature', channelName + ': Temperature', 'number', 'value.temperature');
            yield this.setWeatherObjectAsync(channelName, 'temperature-formatted', channelName + ': Temperature: formatted', 'string', 'text');
            yield this.setWeatherObjectAsync(channelName, 'timestamp', channelName + ': Timestamp', 'number', 'value.time');
            yield this.setWeatherObjectAsync(channelName, 'weatherType', channelName + ': Weather type', 'number', 'value');
            yield this.setWeatherObjectAsync(channelName, 'weatherType-text', channelName + ': Weather type: text', 'string', 'text');
            yield this.setWeatherObjectAsync(channelName, 'windDirection', channelName + ': Wind direction', 'number', 'value');
            yield this.setWeatherObjectAsync(channelName, 'windSpeed', channelName + ': Wind speed', 'number', 'value');
            yield this.setWeatherObjectAsync(channelName, 'windSpeed-formatted', channelName + ': Wind speed: formatted', 'string', 'text');
        });
    }
    setWeatherObjectAsync(channelName, id, name, type, role) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateObjectAsync(this.deviceName + '.' + channelName + '.' + id, {
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
        });
    }
}
exports.WeatherServerHandler = WeatherServerHandler;
//# sourceMappingURL=weather-server-handler.js.map