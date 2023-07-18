import { runJscodeshiftCodemod, runTsMorphCodemod } from '../codemodRunner.js';
import { Codemod } from '../downloadCodemod.js';
import {
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
		const modCommands = await runRepomod(
			indexModule.default,
			flowSettings.inputDirectoryPath,
			flowSettings.usePrettier,
		);

		const formattedInternalCommands = await buildFormattedInternalCommands(
			modCommands,
		);

		for (const command of formattedInternalCommands) {
			await handleFormattedInternalCommand(
				'', // TODO fix me
				command,
				false,
			);
		}
	} else {
		const globbedPaths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			fs,
			ignore: flowSettings.excludePattern.slice(),
			nodir: true,
		});

		const paths = globbedPaths.slice(0, flowSettings.fileLimit);

		for (const path of paths) {
			try {
				const data = await readFile(path, 'utf8');

				const modCommands =
					codemod.engine === 'jscodeshift'
						? runJscodeshiftCodemod(
								indexModule.default,
								path,
								data,
								flowSettings.usePrettier,
						  )
						: runTsMorphCodemod(
								indexModule.default,
								path,
								data,
								flowSettings.usePrettier,
						  );

				const formattedInternalCommands =
					await buildFormattedInternalCommands(modCommands);

				for (const command of formattedInternalCommands) {
					await handleFormattedInternalCommand(
						'', // TODO fix me
						command,
						false,
					);
				}
			} catch {
				//
			}
		}
	}
};
