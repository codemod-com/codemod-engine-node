import * as S from '@effect/schema/Schema';
import * as fs from 'fs';
import type { PrinterBlueprint } from './printer.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { validateAccessToken } from './apis.js';
import Axios from 'axios';

const packageJsonSchema = S.struct({
	main: S.string,
	name: S.string,
});

const accessTokenJsonSchema = S.struct({
	accessToken: S.string,
	username: S.string,
});

export const handlePublishCliCommand = async (
	printer: PrinterBlueprint,
	source: string,
) => {
	// Check if `.intuita/accessToken.json` exists and validate the token
	let accessToken, username;
	const accessTokenJsonPath = join(
		join(homedir(), '.intuita'),
		'accessToken.json',
	);

	const accessTokenJsonData = fs.promises.readFile(accessTokenJsonPath, {
		encoding: 'utf-8',
	});
	try {
		({ accessToken, username } = S.parseSync(accessTokenJsonSchema)(
			JSON.parse(accessTokenJsonData.toString()),
		));
		if (!(await validateAccessToken(accessToken))) {
			printer.printOperationMessage({
				kind: 'error',
				message:
					'The token is incorrect. Please run `intuita login` again and sign in again in the Codemod Studio.',
			});
		}
	} catch (err) {
		printer.printOperationMessage({
			kind: 'error',
			message:
				'You need to authenticate with the Intuita CLI first. Run `intuita login`!',
		});
	}

	// Define file paths
	const sourcePath = source ?? '';
	const packageJsonPath = join(sourcePath, 'package.json');
	const readmePath = join(sourcePath, 'README.md');
	const configJsonPath = join(sourcePath, 'config.json');
	const cjsPath = join(sourcePath, 'dist', 'index.cjs');

	// check if package.json exists
	if (!fs.existsSync(packageJsonPath)) {
		printer.printOperationMessage({
			kind: 'error',
			message: 'package.json cannot be found.',
		});
		return;
	}

	const packageJsonData = fs.promises.readFile(packageJsonPath, {
		encoding: 'utf-8',
	});

	let main, name;
	try {
		// check if `main` and `name` entries exist
		({ main, name } = S.parseSync(packageJsonSchema)(
			JSON.parse(packageJsonData.toString()),
		));
		if (!main.endsWith('dist/index.cjs')) {
			printer.printOperationMessage({
				kind: 'error',
				message:
					'`main` entry in `package.json` must be `./dist/index.cjs`',
			});
		}
	} catch (err) {
		printer.printOperationMessage({
			kind: 'error',
			message: 'package.json is missing `main` or `name` entry.',
		});
	}

	// check if /dist/index.cjs exists
	if (!fs.existsSync(cjsPath)) {
		printer.printOperationMessage({
			kind: 'error',
			message: 'Please run `pnpm build` to build the codemod file first.',
		});
		return;
	}

	const formData = new FormData();
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

			Axios.post(
				'https://telemetry.intuita.io/publishCodemod', // note to greg: modify the endpoint here
				formData,
				{
					timeout: 5000,
				},
			)
				.then((response) => {
					console.log('Response:', response.data);
				})
				.catch((error) => {
					console.error(
						'Error:',
						error.response ? error.response.data : error.message,
					);
				});
		});
	});
};
