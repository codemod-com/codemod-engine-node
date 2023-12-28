import { parentPort } from 'node:worker_threads';
import { type WorkerThreadMessage } from './workerThreadMessages.js';
import {
	type MainThreadMessage,
	decodeMainThreadMessage,
} from './mainThreadMessages.js';
import { runJscodeshiftCodemod } from './runJscodeshiftCodemod.js';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';
import { buildFormattedFileCommands } from './fileCommands.js';
import { ConsoleKind } from './schemata/consoleKindSchema.js';
import { getQuickJS } from 'quickjs-emscripten';
import jscodeshift from '../dist/jscodeshift.txt';

const requireFunction = (module: unknown) => {
	if (typeof module !== 'string') {
		throw new Error('Module name must be a string');
	}

	if (module === 'assert') {
		return {
			ok: () => true,
			strictEqual: () => true,
			deepEqual: () => true,
		};
	}

	if (module === 'os') {
		return {
			EOL: '\n',
		};
	}

	if (module === 'fs') {
		return {};
	}

	throw new Error('Requested ' + module);
};

const getQuickJsContext = async (
	codemodSource: string,
	getData: (path: string) => string,
	callback: (path: string, data: string) => void,
) => {
	const qjs = await getQuickJS();

	const runtime = qjs.newRuntime();

	runtime.setMaxStackSize(1024 * 320);

	runtime.setModuleLoader((moduleName) => {
		if (moduleName === '__intuita__jscodeshift__') {
			return (
				`const require = ${requireFunction.toString()}\n` + jscodeshift
			);
		}

		if (moduleName === '__intuita_codemod__') {
			return codemodSource;
		}

		throw new Error('Requested ' + module);
	});

	const context = runtime.newContext();

	const getDataFunction = context.newFunction('getData', (pathHandle) => {
		const path = context.getString(pathHandle);
		const data = getData(path);
		return context.newString(data);
	});

	const callbackHandle = context.newFunction(
		'__intuita_callback__',
		(pathHandle, sourceHandle) => {
			const path = context.getString(pathHandle);
			const source = context.getString(sourceHandle);

			callback(path, source);
		},
	);

	context.setProp(context.global, '__intuita_get_data__', getDataFunction);
	context.setProp(context.global, '__intuita_callback__', callbackHandle);

	return context;
};

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

const messageHandler = async (m: unknown) => {
	try {
		const message = decodeMainThreadMessage(m);

		if (message.kind === 'initialization') {
			initializationMessage = message;
			return;
		}

		if (message.kind === 'exit') {
			parentPort?.off('message', messageHandler);
			return;
		}

		if (initializationMessage === null) {
			throw new Error();
		}

		try {
			const fileCommands =
				initializationMessage.codemodEngine === 'jscodeshift'
					? runJscodeshiftCodemod(
							initializationMessage.codemodSource,
							message.path,
							message.data,
							initializationMessage.formatWithPrettier,
							initializationMessage.safeArgumentRecord,
							consoleCallback,
					  )
					: runTsMorphCodemod(
							initializationMessage.codemodSource,
							message.path,
							message.data,
							initializationMessage.formatWithPrettier,
							initializationMessage.safeArgumentRecord,
							consoleCallback,
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
