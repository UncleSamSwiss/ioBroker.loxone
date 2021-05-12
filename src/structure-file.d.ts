export interface StructureFile {
    lastModified: Date;
    msInfo: MSInfo;
    globalStates: GlobalStates;
    operatingModes: OperatingModes;
    rooms: { [key: string]: Room };
    cats: { [key: string]: CatValue };
    controls: { [key: string]: Control };
    weatherServer: WeatherServer;
    times: { [key: string]: FieldType };
    mediaServer: { [key: string]: MediaServer };
    autopilot: { [key: string]: Autopilot };
    messageCenter: MessageCenter;
}

export interface MSInfo {
    serialNr: string;
    msName: string;
    projectName: string;
    localUrl: string;
    remoteUrl: string;
    tempUnit: number;
    currency: string;
    squareMeasure: string;
    location: string;
    languageCode: string;
    heatPeriodStart: string;
    heatPeriodEnd: string;
    coolPeriodStart: string;
    coolPeriodEnd: string;
    catTitle: string;
    roomTitle: string;
    miniserverType: number;
    deviceMonitor: string;
    currentUser: CurrentUser;
}

export type GlobalStates = { [key: string]: string };

export type OperatingModes = { [key: string]: string };

export type Controls = { [key: string]: Control };

export interface CurrentUser {
    name: string;
    uuid: string;
    isAdmin: boolean;
    changePassword: boolean;
    userRights: number;
}

export interface CatValue {
    uuid: string;
    name: string;
    image: string;
    defaultRating: number;
    isFavorite: boolean;
    type: string;
    color: string;
}

export interface Room {
    uuid: string;
    name: string;
    image: string;
    defaultRating: number;
    isFavorite: boolean;
    type: number;
}

export interface FieldType {
    id: number;
    name: string;
    analog: boolean;
    format?: string;
    unit?: string;
}

export interface WeatherServer {
    states: WeatherServerStates;
    format: Format;
    weatherTypeTexts: { [key: string]: string };
    weatherFieldTypes: { [key: string]: FieldType };
}

export interface Format {
    relativeHumidity: string;
    temperature: string;
    windSpeed: string;
    precipitation: string;
    barometricPressure: string;
}

export interface WeatherServerStates {
    actual: string;
    forecast: string;
}

export interface MediaServer {
    name: string;
    type: number;
    host: string;
    mac: string;
    uuidAction: string;
    useTriggerCard: boolean;
    states: MediaServerStates;
}

export interface MediaServerStates {
    audioEvents: string;
    apiVersion: string;
    serverState: string;
    grouping: string;
    connState: string;
}

export interface Autopilot {
    name: string;
    uuidAction: string;
    states: AutopilotStates;
}

export interface AutopilotStates {
    changed: string;
    history: string;
}

export interface MessageCenter {
    name: string;
    uuidAction: string;
    states: MessageCenterStates;
}

export interface MessageCenterStates {
    changed: string;
}

export interface Control {
    name: string;
    type: string;
    uuidAction: string;
    room: string;
    cat: string;
    defaultRating: number;
    isFavorite: boolean;
    isSecured: boolean;
    details: { [key: string]: unknown };
    states: ControlStates;
    subControls?: Controls;
}

export type ControlStates = { [key: string]: string };
