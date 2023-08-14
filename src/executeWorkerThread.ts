import { parentPort } from 'node:worker_threads';
import { WorkerThreadMessage } from './workerThreadMessages.js';
import { decodeMainThreadMessage } from './mainThreadMessages.js';
import { runJscodeshiftCodemod } from './runJscodeshiftCodemod.js';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';

import { buildFormattedFileCommands } from './fileCommands.js';

const messageHandler = async (m: unknown) => {
	try {
		const message = decodeMainThreadMessage(m);

		if (message.kind === 'exit') {
			parentPort?.off('message', messageHandler);
			return;
		}

		const fileCommands =
			message.codemodEngine === 'jscodeshift'
				? await runJscodeshiftCodemod(
						message.codemodSource,
						message.path,
						message.data,
						message.formatWithPrettier,
				  )
				: runTsMorphCodemod(
						message.codemodSource,
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
		const message = error instanceof Error ? error.message : String(error);

		parentPort?.postMessage({
			kind: 'error',
			message,
		} satisfies WorkerThreadMessage);
	}
};

export const executeWorkerThread = () => {
	parentPort?.on('message', messageHandler);
};
