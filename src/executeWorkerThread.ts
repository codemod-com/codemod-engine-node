import { parentPort } from 'node:worker_threads';
import { WorkerThreadMessage } from './workerThreadMessages.js';
import { decodeMainThreadMessage } from './mainThreadMessages.js';
import { runJscodeshiftCodemod } from './runJscodeshiftCodemod.js';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';

import { buildFormattedFileCommands } from './fileCommands.js';

class PathAwareError extends Error {
	constructor(public readonly path: string, message?: string | undefined) {
		super(message);
	}
}

const messageHandler = async (m: unknown) => {
	try {
		const message = decodeMainThreadMessage(m);

		if (message.kind === 'exit') {
			parentPort?.off('message', messageHandler);
			return;
		}

		try {
			const fileCommands =
				message.codemodEngine === 'jscodeshift'
					? runJscodeshiftCodemod(
							message.codemodSource,
							message.path,
							message.data,
							message.formatWithPrettier,
							message.argumentRecord,
					  )
					: runTsMorphCodemod(
							message.codemodSource,
							message.path,
							message.data,
							message.formatWithPrettier,
							message.argumentRecord,
					  );

			const commands = await buildFormattedFileCommands(fileCommands);

			parentPort?.postMessage({
				kind: 'commands',
				commands,
			} satisfies WorkerThreadMessage);
		} catch (error) {
			throw new PathAwareError(
				message.path,
				error instanceof Error ? error.message : String(error),
			);
		}
	} catch (error) {
		parentPort?.postMessage({
			kind: 'error',
			message: error instanceof Error ? error.message : String(error),
			path: error instanceof PathAwareError ? error.path : undefined,
		} satisfies WorkerThreadMessage);
	}
};

export const executeWorkerThread = () => {
	parentPort?.on('message', messageHandler);
};
