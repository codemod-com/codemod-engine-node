import { parentPort, workerData } from 'node:worker_threads';
import { type WorkerThreadMessage } from './workerThreadMessages.js';
import {
	decodeMainThreadMessage,
	decodeWorkerDataSchema,
} from './mainThreadMessages.js';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';
import { FileCommand, buildFormattedFileCommands } from './fileCommands.js';
import { ConsoleKind } from './schemata/consoleKindSchema.js';
import { getQuickJsContext } from './getQuickJsContext.js';

class PathAwareError extends Error {
	constructor(public readonly path: string, message?: string | undefined) {
		super(message);
	}
}

const consoleCallback = (consoleKind: ConsoleKind, message: string): void => {
	parentPort?.postMessage({
		kind: 'console',
		consoleKind,
		message,
	} satisfies WorkerThreadMessage);
};

const parsedWorkerData = decodeWorkerDataSchema(workerData);

let context: Awaited<ReturnType<typeof getQuickJsContext>> | null = null;

const messageHandler = async (m: unknown) => {
	try {
		const message = decodeMainThreadMessage(m);

		if (message.kind === 'exit') {
			parentPort?.off('message', messageHandler);
			return;
		}

		try {
			let fileCommands: ReadonlyArray<FileCommand>;

			if (parsedWorkerData.codemodEngine === 'jscodeshift') {
				if (context === null) {
					context = await getQuickJsContext(
						parsedWorkerData.codemodSource,
					);
				}

				const newData = await context.execute(
					message.path,
					message.data,
				);

				console.log('newData', newData);

				if (newData === null) {
					fileCommands = [];
				} else {
					fileCommands = [
						{
							kind: 'updateFile',
							oldPath: message.path,
							oldData: message.data,
							newData,
							formatWithPrettier:
								parsedWorkerData.formatWithPrettier,
						},
					];
				}
			} else {
				fileCommands = runTsMorphCodemod(
					parsedWorkerData.codemodSource,
					message.path,
					message.data,
					parsedWorkerData.formatWithPrettier,
					parsedWorkerData.safeArgumentRecord,
					consoleCallback,
				);
			}

			const commands = await buildFormattedFileCommands(fileCommands);

			console.log('commands', commands);

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
		console.error(error);
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
