import { Message } from './messages.js';

export class Printer {
	public constructor(private readonly __useJson: boolean) {}

	public error(error: Error) {
		if (this.__useJson) {
			console.error(JSON.stringify({ message: error.message }));
		}

		console.error(error);
	}

	public log(message: Message) {
		if (this.__useJson) {
			console.log(JSON.stringify(message));
		}

		console.log(message);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public trace(message: string, ...optionalParams: any[]) {
		if (this.__useJson) {
			return;
		}

		console.trace(message, ...optionalParams);
	}
}
