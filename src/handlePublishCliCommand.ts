import * as fs from 'fs';
import type { PrinterBlueprint } from './printer.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { object, string, parse } from 'valibot';
import { publish, validateAccessToken } from './apis.js';
import { CodemodDownloader } from './downloadCodemod.js';
import FormData from 'form-data';

const packageJsonSchema = object({
	main: string(),
	name: string(),
});

export const handlePublishCliCommand = async (
	codemodDownloader: CodemodDownloader,
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

	const packageJsonData = await fs.promises.readFile(
		join(sourcePath, 'package.json'),
		{
			encoding: 'utf-8',
		},
	);

	const pkg = parse(packageJsonSchema, JSON.parse(packageJsonData));

	if (
		!pkg.name.startsWith(`@${username}/`) ||
		!/[a-zA-Z0-9_/-]+/.test(pkg.name)
	) {
		throw new Error(
			'The package name must start with your username and contain allowed characters',
		);
	}

	const indexCjsData = await fs.promises.readFile(
		join(sourcePath, pkg.main),
		{
			encoding: 'utf-8',
		},
	);

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
	formData.append('index.cjs', Buffer.from(indexCjsData));
	formData.append('config.json', Buffer.from(configJsonData));

	if (descriptionMdData) {
		formData.append('description.md', descriptionMdData);
	}

	await publish(token, formData);

	try {
		await codemodDownloader.download(pkg.name);
	} catch (error) {
		printer.printConsoleMessage(
			'error',
			`Could not download the "${pkg.name}" package at this time`,
		);

		printer.printConsoleMessage(
			'info',
			'Use the command "intuita sync ${pkg.name}" to make the package available for usage in the CLI or the VSCode Extension',
		);
	}
};
