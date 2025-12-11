import { AalEmergency } from './AalEmergency';
import { AalSmartAlarm } from './AalSmartAlarm';
import { Alarm } from './Alarm';
import { AlarmClock } from './AlarmClock';
import { Application } from './Application';
import { AudioZone } from './AudioZone';
import { CentralAlarm } from './CentralAlarm';
import { CentralAudioZone } from './CentralAudioZone';
import { CentralGate } from './CentralGate';
import { CentralJalousie } from './CentralJalousie';
import { CentralLightController } from './CentralLightController';
import { Colorpicker } from './Colorpicker';
import { ColorPickerV2 } from './ColorPickerV2';
import { Daytimer } from './Daytimer';
import { Dimmer } from './Dimmer';
import { EIBDimmer } from './EIBDimmer';
import { Fronius } from './Fronius';
import { Gate } from './Gate';
import { Hourcounter } from './Hourcounter';
import { InfoOnlyAnalog } from './InfoOnlyAnalog';
import { InfoOnlyDigital } from './InfoOnlyDigital';
import { InfoOnlyText } from './InfoOnlyText';
import { Intercom } from './Intercom';
import { IRCDaytimer } from './IRCDaytimer';
import { IRCV2Daytimer } from './IRCV2Daytimer';
import { IRoomControllerV2 } from './IRoomControllerV2';
import { Jalousie } from './Jalousie';
import { LightController } from './LightController';
import { LightControllerV2 } from './LightControllerV2';
import { MailBox } from './MailBox';
import { Meter } from './Meter';
import { PresenceDetector } from './PresenceDetector';
import { Pushbutton } from './Pushbutton';
import { Radio } from './Radio';
import { Remote } from './Remote';
import { Slider } from './Slider';
import { SmokeAlarm } from './SmokeAlarm';
import { Switch } from './Switch';
import { SystemScheme } from './SystemScheme';
import { TextInput } from './TextInput';
import { TextState } from './TextState';
import { TimedSwitch } from './TimedSwitch';
import { Tracker } from './Tracker';
import { Unknown } from './Unknown';
import { UpDownAnalog } from './UpDownAnalog';
import { ValueSelector } from './ValueSelector';
import { WindowMonitor } from './WindowMonitor';

export const AllControls = {
    AalEmergency,
    AalSmartAlarm,
    AlarmClock,
    Alarm,
    Application,
    AudioZone,
    CentralAlarm,
    CentralAudioZone,
    CentralGate,
    CentralJalousie,
    CentralLightController,
    Colorpicker,
    ColorPickerV2,
    Daytimer,
    Dimmer,
    EIBDimmer,
    Fronius,
    Gate,
    Hourcounter,
    InfoOnlyAnalog,
    InfoOnlyDigital,
    InfoOnlyText,
    Intercom,
    IRCDaytimer,
    IRCV2Daytimer,
    IRoomControllerV2,
    Jalousie,
    LightController,
    LightControllerV2,
    MailBox,
    Meter,
    PresenceDetector,
    Pushbutton,
    Radio,
    Remote,
    Slider,
    SmokeAlarm,
    Switch,
    SystemScheme,
    TextInput,
    TextState,
    TimedSwitch,
    Tracker,
    Unknown,
    UpDownAnalog,
    ValueSelector,
    WindowMonitor,
} as const;
