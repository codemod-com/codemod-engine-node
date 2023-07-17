import { runJscodeshiftCodemod } from '../codemodRunner.js';
import { FSOption } from 'path-scurry';
import {
	FormattedInternalCommand,
	buildFormattedInternalCommands,
} from '../modCommands.js';
import { readFile } from 'fs/promises';

export const runJscodeshiftCodemod2 = async (
	indexPath: string,
	paths: ReadonlyArray<string>,
	fs: FSOption,
	formatWithPrettier: boolean,
) => {
	const m = await import(indexPath);

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

	console.log(formattedInternalCommands);
};
