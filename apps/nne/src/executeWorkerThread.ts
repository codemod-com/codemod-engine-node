import { readFileSync } from 'node:fs';
import { workerData } from 'node:worker_threads';
import { codemods as nneCodemods } from '@nne/codemods';
import { codemods as muiCodemods } from '@nne/mui-codemods';
import { MessageKind, ProgressMessage } from './messages';
import * as ts from 'typescript';
import { NewGroup } from './groups';
import { Codemod, runCodemod } from './codemodRunner';
import { Filemod, runFilemod } from './filemodRunner';
import { handleCommand, ModCommand } from './modCommands';
import { CompositeMod, runCompositeMod } from './compositeModRunner';

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

	const mods: (Codemod | Filemod | CompositeMod)[] = [];

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
		mods.push(...nneCodemods as any);
		mods.push(...muiCodemods);
	}

	for (const mod of mods) {
		if (newGroups.length > 0 && !newGroups.includes(mod.group)) {
			continue;
		}

		let commands: ModCommand[];

		try {
			if (
				mod.engine === 'jscodeshift' &&
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
				

				commands = await runCompositeMod(mod, filePath, oldSource);
			} else {
				throw new Error();
			}

			for (const command of commands) {
				const message = await handleCommand(
					outputDirectoryPath,
					mod.caseTitle,
					command,
				);

				console.log(JSON.stringify(message));
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
