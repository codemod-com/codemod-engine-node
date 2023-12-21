import * as fs from 'fs';
import type { PrinterBlueprint } from './printer.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { validateAccessToken } from './apis.js';
import Axios from 'axios';

import { object, string, parse } from 'valibot';

const packageJsonSchema = object({
	main: string(),
	name: string(),
});

export const handlePublishCliCommand = async (
	printer: PrinterBlueprint,
	sourcePath: string,
) => {
	const tokenTxtPath = join(homedir(), '.intuita', 'token.txt');

	const token = await fs.promises.readFile(tokenTxtPath, {
		encoding: 'utf-8',
	});

	const { username } = await validateAccessToken(token);

	if (username === null) {
		throw new Error(
			'The username of the current user is not known. Aborting the operation.',
		);
	}

	const packageJsonPath = join(sourcePath, 'package.json'); // must exist

	const packageJsonData = await fs.promises.readFile(packageJsonPath, {
		encoding: 'utf-8',
	});

	const pkg = parse(packageJsonSchema, JSON.parse(packageJsonData));

	if (
		!pkg.name.startsWith(`@${username}/`) ||
		!/[a-zA-Z0-9_/-]+/.test(pkg.name)
	) {
		throw new Error(
			'The package name must start with your username and contain allowed characters',
		);
	}

	const indexCjsPath = join(sourcePath, pkg.main);

	const indexCjsData = await fs.promises.readFile(indexCjsPath, {
		encoding: 'utf-8',
	});

	const configJsonData = JSON.stringify(
		{
			schemaVersion: '1.0.0',
			name: pkg.name,
			engine: 'jscodeshift',
		},
		null,
		2,
	);

	let descriptionMdData: string | null = null;

	try {
		descriptionMdData = await fs.promises.readFile(
			join(sourcePath, 'README.md'),
			{
				encoding: 'utf-8',
			},
		);
	} catch {
		//
	}

	const formData = new FormData();
	formData.append('package.json', packageJsonData);
	formData.append('index.cjs', indexCjsData);
	formData.append('config.json', configJsonData);

	if (descriptionMdData) {
		formData.append('description.md', descriptionMdData);
	}

	await Axios.post('https://telemetry.intuita.io/publish', formData, {
		timeout: 10000,
	});

	// TODO show a command to sync it
};
