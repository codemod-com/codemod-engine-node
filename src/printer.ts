import type { Message } from './messages.js';

export type PrinterBlueprint = Readonly<{
	log(message: Message): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	info(message: string, ...optionalParams: any[]): void;
	warn(message: string): void;
}>;

export class Printer implements PrinterBlueprint {
	public constructor(private readonly __useJson: boolean) {}

	public log(message: Message) {
		if (this.__useJson) {
			if (message.kind === 'error') {
				console.error(JSON.stringify(message));
				return;
			}

			console.log(JSON.stringify(message));
			return;
		}

		if (message.kind === 'error') {
			console.error(message.message);
		}

		if (message.kind === 'progress') {
			console.log(
				'Processed %d files out of %d',
				message.processedFileNumber,
				message.totalFileNumber,
			);
		}

		if (message.kind === 'names') {
			for (const name of message.names) {
				console.log(name);
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public info(message: string, ...optionalParams: any[]) {
		if (this.__useJson) {
			return;
		}

		console.info(message, ...optionalParams);
	}

	public warn(message: string) {
		if (this.__useJson) {
			return;
		}

		console.warn(message);
	}
}
