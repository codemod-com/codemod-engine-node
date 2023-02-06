import { readFileSync } from 'node:fs';
import { workerData } from 'node:worker_threads';
import { codemods as nneCodemods } from '@nne/codemods';
import { codemods as muiCodemods } from '@nne/mui-codemods';
import {
	CreateMessage,
	DeleteMessage,
	MessageKind,
	MoveMessage,
	ProgressMessage,
	RewriteMessage,
} from './messages';
import * as ts from 'typescript';
import { NewGroup } from './groups';

import { Codemod, runCodemod } from './codemodRunner';
import { Filemod, runFilemod } from './filemodRunner';
import {
	handleCommand,
	handleCreateFileCommand,
	handleUpdateFileCommand,
} from './modCommands';

export const executeWorkerThread = async () => {
	const {
		codemodFilePath,
		newGroups,
		filePath,
		outputDirectoryPath,
		totalFileCount,
		fileCount,
	} = workerData;

	newGroups satisfies ReadonlyArray<NewGroup>;

	const oldSource = readFileSync(filePath, { encoding: 'utf8' });

	const mods: (Codemod | Filemod)[] = [];

	if (codemodFilePath) {
		try {
			if ((codemodFilePath as string).endsWith('.ts')) {
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

		const messages: (
			| CreateMessage
			| RewriteMessage
			| MoveMessage
			| DeleteMessage
		)[] = [];

		try {
			if (
				mod.engine === 'jscodeshift' &&
				typeof mod.transformer === 'function' &&
				mod.transformer &&
				mod.withParser
			) {
				const commands = await runCodemod(
					// outputDirectoryPath,
					filePath,
					oldSource,
					mod as any, // TODO fixme
				);

				for (const command of commands) {
					messages.push(
						await handleCommand(
							outputDirectoryPath,
							mod.caseTitle,
							command,
						),
					);
				}
			} else if (
				mod.engine === 'filemod-engine' &&
				mod.transformer &&
				typeof mod.transformer === 'string'
			) {
				messages = await runFilemod(mod as any, filePath);
			} else {
				throw new Error();
			}

			for (const message of messages) {
				console.log(message);
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error(
					JSON.stringify({
						message: error.message,
						caseTitle: mod.caseTitle,
						group: mod.group,
					}),
				);
			}
		}
	}

	const progressMessage: ProgressMessage = {
		k: MessageKind.progress,
		p: fileCount,
		t: totalFileCount,
	};

	console.log(JSON.stringify(progressMessage));
};
