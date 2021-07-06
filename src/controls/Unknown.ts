import * as SentryNode from '@sentry/node';
import { Control } from '../structure-file';
import { ControlBase, ControlType } from './control-base';

/**
 * This class is used if the control has an unknown type.
 * It will just load the simple default states.
 */
export class Unknown extends ControlBase {
    async loadAsync(type: ControlType, uuid: string, control: Control): Promise<void> {
        // report unsupported control
        const existingObject = this.adapter.getExistingObject(uuid);
        const currentVersion = this.adapter.version;
        const msg = `Unsupported ${type} control ${control.type}`;
        this.adapter.log.info(msg);
        if (existingObject?.native?.reportedVersion !== currentVersion) {
            // missing control wasn't reported yet for the current adapter version
            if (!this.adapter.reportedMissingControls.has(msg)) {
                this.adapter.reportedMissingControls.add(msg);
                const sentry = this.adapter.getSentry();
                sentry?.withScope((scope) => {
                    scope.setExtra('control', JSON.stringify(control, null, 2));
                    sentry.captureMessage(msg, SentryNode.Severity.Warning);
                });
            }
        }

        await this.updateObjectAsync(uuid, {
            type: type,
            common: {
                name: `Unsupported: ${control.name}`,
                role: 'info',
            },
            native: { control, reportedVersion: currentVersion },
        });

        await this.loadOtherControlStatesAsync(control.name, uuid, control.states, []);

        await this.loadSubControlsAsync(uuid, control);
    }
}
