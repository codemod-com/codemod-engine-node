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
	const readmePath = join(sourcePath, 'README.md'); // may exist
	const configJsonPath = join(sourcePath, 'config.json'); // may exist

	const packageJsonData = await fs.promises.readFile(packageJsonPath, {
		encoding: 'utf-8',
	});

	const pkg = parse(packageJsonSchema, JSON.parse(packageJsonData));

	if (!pkg.name.startsWith(`@${username}/`)) {
		throw new Error('The package name must start with your username');
	}

	const cjsPath = join(sourcePath, pkg.main);

	// check if /dist/index.cjs exists
	if (!fs.existsSync(cjsPath)) {
		printer.printOperationMessage({
			kind: 'error',
			message: 'Please run `pnpm build` to build the codemod file first.',
		});
		return;
	}

	const packageName = `@${username}/${name}`;

	if (!fs.existsSync(configJsonPath)) {
		// Create a temporary config object in memory
		const temporaryConfig = {
			schemaVersion: '1.0.0',
			name: packageName,
			engine: 'jscodeshift',
			// Add other properties as needed
		};

		// Convert the config object to a JSON string
		const temporaryConfigJSON = JSON.stringify(temporaryConfig, null, 2);

		// Write the JSON string to a temporary config.json file
		fs.writeFileSync(configJsonPath, temporaryConfigJSON);
	}

	[
		{ path: cjsPath, filename: 'index.cjs' },
		{ path: readmePath, filename: 'description.md' },
		{ path: configJsonPath, filename: 'config.json' },
	].forEach(({ filename, path }) => {
		fs.readFile(path, (err, data) => {
			if (err) {
				console.error('Error reading file:', err);
				return;
			}
			if (!fs.existsSync(path)) {
				return;
			}

			formData.append(filename, data as unknown as Blob);
		});
	});

	const formData = new FormData();
	formData.append('package.json', packageJsonData);

	await Axios.post('https://telemetry.intuita.io/publish', formData, {
		timeout: 5000,
	});

	// TODO show a command to sync it
};
