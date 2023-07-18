import { runJscodeshiftCodemod, runTsMorphCodemod } from '../codemodRunner.js';
import { Codemod } from '../downloadCodemod.js';
import {
	ModCommand,
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

	let modCommands: ReadonlyArray<ModCommand>;

	if (codemod.engine === 'repomod-engine') {
		modCommands = await runRepomod(
			indexModule.default,
			flowSettings.inputDirectoryPath,
			flowSettings.usePrettier,
		);
	} else {
		const globbedPaths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			fs,
			ignore: flowSettings.excludePattern.slice(),
			nodir: true,
		});

		const paths = globbedPaths.slice(0, flowSettings.fileLimit);

		const _commands: ModCommand[] = [];

		for (const path of paths) {
			try {
				const data = await readFile(path, 'utf8');

				_commands.push(
					...(codemod.engine === 'jscodeshift'
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
						  )),
				);
			} catch {
				//
			}
		}

		modCommands = _commands;
	}

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
};
