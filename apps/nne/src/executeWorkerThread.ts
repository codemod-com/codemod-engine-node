import { readFileSync } from 'node:fs';
import { parentPort } from 'node:worker_threads';
import { codemods as nneCodemods } from '@nne/codemods';
import { codemods as muiCodemods } from '@nne/mui-codemods';
import * as ts from 'typescript';
import * as tsmorph from 'ts-morph';
import { NewGroup } from './groups.js';
import { Codemod, runCodemod } from './codemodRunner.js';
import { Filemod, runFilemod } from './filemodRunner.js';
import {
	buildFormattedInternalCommands,
	handleFormattedInternalCommand,
	ModCommand,
} from './modCommands.js';
import { CompositeMod, runCompositeMod } from './compositeModRunner.js';
import { WorkerThreadMessage } from './workerThreadMessages.js';
import { decodeMainThreadMessage } from './mainThreadMessages.js';

type CodemodExecutionErrorType = 'unrecognizedCodemod' | 'errorRunningCodemod';
class CodemodExecutionError extends Error {
	public readonly kind: CodemodExecutionErrorType;
	constructor(message: string, kind: CodemodExecutionErrorType) {
		super(message);
		this.kind = kind;
	}
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const filterNeitherNullNorUndefined = <T>(value: T): value is T & {} =>
	value !== undefined && value !== null;

export const executeWorkerThread = () => {
	const messageHandler = async (m: unknown) => {
		const message = decodeMainThreadMessage(m);

		if (message.kind === 'exit') {
			parentPort?.off('message', messageHandler);
			return;
		}

		const { codemodFilePath, newGroups, filePath, outputDirectoryPath } =
			message;

		newGroups satisfies ReadonlyArray<NewGroup>;

		const oldSource = readFileSync(filePath, { encoding: 'utf8' });

		const mods: (Codemod | Filemod | CompositeMod)[] = [];

		if (codemodFilePath != null) {
			try {
				if (codemodFilePath.endsWith('.tsm.ts')) {
					const source = readFileSync(codemodFilePath, {
						encoding: 'utf8',
					});
					const compiledCode = ts.transpileModule(source, {
						compilerOptions: { module: ts.ModuleKind.CommonJS },
					});

					type Exports =
						| {
								__esModule?: true;
								default?: unknown;
								handleSourceFile?: unknown;
						  }
						// eslint-disable-next-line @typescript-eslint/ban-types
						| Function;

					const exports: Exports = {};
					const module = { exports };
					const req = (name: string) => {
						if (name === 'ts-morph') {
							return tsmorph;
						}
					};

					const keys = ['module', 'exports', 'require'];
					const values = [module, exports, req];

					// eslint-disable-next-line prefer-spread
					new Function(...keys, compiledCode.outputText).apply(
						null,
						values,
					);

					const transformer =
						typeof exports === 'function'
							? exports
							: exports.__esModule &&
							  typeof exports.default === 'function'
							? exports.default
							: typeof exports.handleSourceFile === 'function'
							? exports.handleSourceFile
							: null;

					if (transformer === null) {
						throw new Error(
							'Could not compile the provided codemod',
						);
					}

					mods.push({
						engine: 'tsmorph',
						caseTitle: codemodFilePath,
						group: null,
						transformer,
						withParser: 'tsx',
					});
				} else if (codemodFilePath.endsWith('.ts')) {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const requireFromString = require('require-from-string');

					const source = readFileSync(codemodFilePath, {
						encoding: 'utf8',
					});
					const compiledCode = ts.transpileModule(source, {
						compilerOptions: { module: ts.ModuleKind.CommonJS },
					});

					const mod = requireFromString(compiledCode.outputText);

					const transformer = 'default' in mod ? mod.default : mod;

					mods.push({
						engine: 'jscodeshift',
						caseTitle: codemodFilePath,
						group: null,
						transformer,
						withParser: 'tsx',
					});
				} else {
					mods.push({
						engine: 'jscodeshift',
						caseTitle: codemodFilePath,
						group: null,
						transformer: require(codemodFilePath),
						withParser: 'tsx',
					});
				}
			} catch (error) {
				console.error(error);
			}
		} else {
			mods.push(...(nneCodemods as any));
			mods.push(...muiCodemods);
		}

		for (const mod of mods) {
			if (newGroups.length > 0 && !newGroups.includes(mod.group)) {
				continue;
			}

			let commands: ModCommand[];

			try {
				if (
					(mod.engine === 'jscodeshift' ||
						mod.engine === 'tsmorph') &&
					typeof mod.transformer === 'function' &&
					mod.transformer &&
					mod.withParser
				) {
					commands = await runCodemod(
						// outputDirectoryPath,
						filePath,
						oldSource,
						mod as any, // TODO fixme
					);
				} else if (
					mod.engine === 'filemod-engine' &&
					mod.transformer &&
					typeof mod.transformer === 'string'
				) {
					commands = await runFilemod(mod as any, filePath);
				} else if (mod.engine === 'composite-mod-engine') {
					const subMods = (mod.mods as unknown as string[])
						.map((caseTitle) =>
							mods.find((m) => caseTitle.endsWith(m.caseTitle)),
						)
						.filter(filterNeitherNullNorUndefined);

					const newMod = { ...mod, mods: subMods };

					commands = await runCompositeMod(
						newMod as any,
						filePath,
						oldSource,
					);
				} else {
					throw new CodemodExecutionError(
						`Unrecognized mod`,
						'unrecognizedCodemod',
					);
				}

				const formattedInternalCommands =
					await buildFormattedInternalCommands(commands);

				for (const formattedInternalCommand of formattedInternalCommands) {
					const message = await handleFormattedInternalCommand(
						outputDirectoryPath,
						mod.caseTitle,
						formattedInternalCommand,
					);

					parentPort?.postMessage({
						kind: 'message',
						message,
					} satisfies WorkerThreadMessage);
				}
			} catch (error) {
				if (
					error instanceof CodemodExecutionError ||
					error instanceof Error
				) {
					console.error(
						JSON.stringify({
							message: error.message,
							caseTitle: mod.caseTitle,
							group: mod.group,
							...('kind' in error ? { kind: error.kind } : {}),
						}),
					);
				}
			}
		}

		parentPort?.postMessage({
			kind: 'idleness',
		} satisfies WorkerThreadMessage);
	};

	parentPort?.on('message', messageHandler);
};
