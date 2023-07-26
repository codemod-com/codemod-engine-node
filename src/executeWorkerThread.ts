import { parentPort } from 'node:worker_threads';
import { WorkerThreadMessage } from './workerThreadMessages.js';
import { decodeMainThreadMessage } from './mainThreadMessages.js';
import { runJscodeshiftCodemod } from './runJscodeshiftCodemod.js';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';

import { buildFormattedFileCommands } from './fileCommands.js';
import { getTransformer } from './getTransformer.js';

const messageHandler = async (m: unknown) => {
	try {
		const message = decodeMainThreadMessage(m);

		if (message.kind === 'exit') {
			parentPort?.off('message', messageHandler);
			return;
		}

		const transformer = getTransformer(message.codemodSource);

		const fileCommands =
			message.codemodEngine === 'jscodeshift'
				? runJscodeshiftCodemod(
						// @ts-expect-error function type
						transformer,
						message.path,
						message.data,
						message.formatWithPrettier,
				  )
				: runTsMorphCodemod(
						// @ts-expect-error function type
						transformer,
						message.path,
						message.data,
						message.formatWithPrettier,
				  );

		const commands = await buildFormattedFileCommands(fileCommands);

		parentPort?.postMessage({
			kind: 'commands',
			commands,
		} satisfies WorkerThreadMessage);
	} catch (error) {
		if (error instanceof Error) {
			parentPort?.postMessage({
				kind: 'error',
				message: error.message,
			} satisfies WorkerThreadMessage);
		}
	}
};

export const executeWorkerThread = () => {
	parentPort?.on('message', messageHandler);
};
