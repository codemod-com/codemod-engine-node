import type { Contracts, TelemetryClient } from 'applicationinsights';
import { APP_INSIGHTS_TAG } from './constants.js';

export type Event = Readonly<{
	kind: 'codemodExecuted';
	fileCount: number;
	executionId: string;
	codemodName: string;
}> |  Readonly<{
	kind: 'failedToExecuteCommand';
	commandName: string;
}>;

export type TelemetryBlueprint = {
	sendEvent(event: Event): void;
};

export class AppInsightsTelemetryService implements TelemetryBlueprint {
	constructor(private readonly __telemetryClient: TelemetryClient) {
		this.__telemetryClient.context.tags[
			this.__telemetryClient.context.keys.cloudRole
		] = APP_INSIGHTS_TAG;
	}

	// AppInsights expects numeric values to be placed under "measurements" and string values under "properties"
	private __rawEventToTelemetryEvent(
		event: Event,
	): Contracts.EventTelemetry {
		const properties: Record<string, string> = {};
		const measurements: Record<string, number> = {};

		for (const [key, value] of Object.entries(event)) {
			if (typeof value === 'string') {
				properties[key] = value;
				continue;
			}

			if (typeof value === 'number') {
				measurements[key] = value;
				continue;
			}
		}

		return {
			name: event.kind,
			properties,
			measurements,
		};
	}

	public sendEvent(event: Event): void {
		this.__telemetryClient.trackEvent(
			this.__rawEventToTelemetryEvent(event),
		);
	}
}
