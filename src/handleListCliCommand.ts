import * as S from '@effect/schema/Schema';
import * as fs from 'fs';
import { glob } from 'glob';
import { mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { PrinterBlueprint } from './printer.js';

export const handleListNamesCommand = async (printer: PrinterBlueprint) => {
	const intuitaDirectoryPath = join(homedir(), '.intuita');

	await mkdir(intuitaDirectoryPath, { recursive: true });

	const configFiles = await glob('**/config.json', {
		absolute: true,
		cwd: intuitaDirectoryPath,
		fs,
		nodir: true,
	});

	const codemodNames = await Promise.allSettled(
		configFiles.map(async (cfg) => {
			const configJson = await readFile(cfg, 'utf8');

			const parsedConfig = JSON.parse(configJson);
			return parsedConfig.name;
		}),
	);

	const onlyValid = codemodNames
		.map((x) => x.status === 'fulfilled' && x.value)
		.filter(Boolean)
		.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

	const names = S.parseSync(S.array(S.string))(onlyValid);

	printer.printOperationMessage({ kind: 'names', names });
};
