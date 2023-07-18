import { runJscodeshiftCodemod } from '../codemodRunner.js';
import { Codemod } from '../downloadCodemod.js';
import {
	FormattedInternalCommand,
	buildFormattedInternalCommands,
	handleFormattedInternalCommand,
} from '../modCommands.js';
import { readFile } from 'fs/promises';
import { runRepomod } from '../repomodRunner.js';
import { glob } from 'glob';
import type { FlowSettings } from '../executeMainThread.js';
import * as fs from 'fs';

export const runCodemod = async (
	codemod: Codemod,
	flowSettings: FlowSettings,
) => {
	if (codemod.engine === 'piranha') {
		throw new Error('Piranha not supported');
	}

	if (codemod.engine === 'recipe') {
		for (const c of codemod.codemods) {
			await runCodemod(c, flowSettings);
		}

		return;
	}

	const indexModule = await import(codemod.indexPath);

	if (codemod.engine === 'repomod-engine') {
		const commands = await runRepomod(
			indexModule.default,
			flowSettings.inputDirectoryPath,
			flowSettings.usePrettier,
		);
	}

	if (codemod.engine === 'jscodeshift' || codemod.engine === 'ts-morph') {
		const globbedPaths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			fs,
			ignore: flowSettings.excludePattern.slice(),
			nodir: true,
		});

		const paths = globbedPaths.slice(0, flowSettings.fileLimit);

		// remodel into a map
		const formattedInternalCommands: FormattedInternalCommand[] = [];

		for (const path of paths) {
			try {
				const data = await readFile(path, 'utf8');

				const modCommands = runJscodeshiftCodemod(
					indexModule.default,
					path,
					data,
					flowSettings.usePrettier,
				);

				const fiCommands = await buildFormattedInternalCommands(
					modCommands,
				);

				formattedInternalCommands.push(...fiCommands);
			} catch {
				//
			}
		}

		for (const command of formattedInternalCommands) {
			await handleFormattedInternalCommand(
				'', // TODO fix me
				command,
				false,
			);
		}
	}
};
