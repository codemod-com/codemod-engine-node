import { runJscodeshiftCodemod } from '../codemodRunner.js';
import { Codemod } from '../downloadCodemod.js';
import {
	FormattedInternalCommand,
	buildFormattedInternalCommands,
	handleFormattedInternalCommand,
} from '../modCommands.js';
import { readFile } from 'fs/promises';

export const runJscodeshiftCodemod2 = async (
	codemod: Codemod,
	paths: ReadonlyArray<string>,
	formatWithPrettier: boolean,
) => {
	if (codemod.engine === 'piranha') {
		throw new Error('Piranha not supported');
	}

	if (codemod.engine === 'recipe') {
		for (const c of codemod.codemods) {
			// TODO it doesn't take care of removed or added paths
			await runJscodeshiftCodemod2(c, paths, formatWithPrettier);
		}
	}

	if (codemod.engine === 'repomod-engine') {
		return;
	}

	if (codemod.engine === 'jscodeshift' || codemod.engine === 'ts-morph') {
		const m = await import(codemod.indexPath);

		// remodel into a map
		const formattedInternalCommands: FormattedInternalCommand[] = [];

		for (const path of paths) {
			try {
				const data = await readFile(path, 'utf8');

				const modCommands = runJscodeshiftCodemod(
					m.default,
					path,
					data,
					formatWithPrettier,
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
