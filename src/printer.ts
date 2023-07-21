import { Message } from './messages.js';

export class Printer {
	public constructor(private readonly __useJson: boolean) {}

	public error(error: Error) {
		if (this.__useJson) {
			console.error(JSON.stringify({ message: error.message }));
			return;
		}

		console.error(error);
	}

	public log(message: Message) {
		if (this.__useJson) {
			console.log(JSON.stringify(message));
			return;
		}

		console.log(message);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public info(message: string, ...optionalParams: any[]) {
		if (this.__useJson) {
			return;
		}

		console.info(message, ...optionalParams);
	}
}
