import { parentPort } from 'node:worker_threads';
import { WorkerThreadMessage } from './workerThreadMessages.js';
import { decodeMainThreadMessage } from './mainThreadMessages.js';
import { runJscodeshiftCodemod } from './runJscodeshiftCodemod.js';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';
import { Repomod } from '@intuita-inc/repomod-engine-api';
import { Dependencies } from './runRepomod.js';

import * as tsmorph from 'ts-morph';
import nodePath from 'node:path';
import { buildFormattedFileCommands } from './fileCommands.js';

const getTransformer = (source: string) => {
	type Exports =
		| {
				__esModule?: true;
				default?: unknown;
				handleSourceFile?: unknown;
				repomod?: Repomod<Dependencies>;
		  }
		// eslint-disable-next-line @typescript-eslint/ban-types
		| Function;

	const module = { exports: {} as Exports };
	const req = (name: string) => {
		if (name === 'ts-morph') {
			return tsmorph;
		}

		if (name === 'node:path') {
			return nodePath;
		}
	};

	const keys = ['module', 'require'];
	const values = [module, req];

	// eslint-disable-next-line prefer-spread
	new Function(...keys, source).apply(null, values);

	return typeof module.exports === 'function'
		? module.exports
		: module.exports.__esModule &&
		  typeof module.exports.default === 'function'
		? module.exports.default
		: typeof module.exports.handleSourceFile === 'function'
		? module.exports.handleSourceFile
		: module.exports.repomod !== undefined
		? module.exports.repomod
		: null;
};

const messageHandler = async (m: unknown) => {
	const message = decodeMainThreadMessage(m);

	if (message.kind === 'exit') {
		parentPort?.off('message', messageHandler);
		return;
	}

	try {
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
		// TODO
	}

	parentPort?.postMessage({
		kind: 'idleness',
	} satisfies WorkerThreadMessage);
};

export const executeWorkerThread = () => {
	parentPort?.on('message', messageHandler);
};
