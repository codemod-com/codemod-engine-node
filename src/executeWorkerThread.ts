import { parentPort } from 'node:worker_threads';
import { type WorkerThreadMessage } from './workerThreadMessages.js';
import {
	type MainThreadMessage,
	decodeMainThreadMessage,
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

let initializationMessage:
	| (MainThreadMessage & { kind: 'initialization' })
	| null = null;

let context: Awaited<ReturnType<typeof getQuickJsContext>> | null = null;

const messageHandler = async (m: unknown) => {
	try {
		const message = decodeMainThreadMessage(m);

		if (message.kind === 'initialization') {
			console.log('HERE');
			initializationMessage = message;

			console.log('HERE2333');

			return;
		}

		if (message.kind === 'exit') {
			parentPort?.off('message', messageHandler);
			return;
		}

		if (initializationMessage === null) {
			throw new Error('No initialization message');
		}

		try {
			let fileCommands: ReadonlyArray<FileCommand>;

			if (initializationMessage.codemodEngine === 'jscodeshift') {
				if (context === null) {
					context = await getQuickJsContext(
						initializationMessage.codemodSource,
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
								initializationMessage.formatWithPrettier,
						},
					];
				}
			} else {
				fileCommands = runTsMorphCodemod(
					initializationMessage.codemodSource,
					message.path,
					message.data,
					initializationMessage.formatWithPrettier,
					initializationMessage.safeArgumentRecord,
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

	parentPort?.postMessage({
		kind: 'messageHandlerRegistered',
	} satisfies WorkerThreadMessage);

	console.error('HERE');
};
