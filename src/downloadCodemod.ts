import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { downloadFile } from './fileSystemUtilities.js';
import { inflate } from 'node:zlib';
import { promisify } from 'node:util';

const promisifiedInflate = promisify(inflate);

import * as S from '@effect/schema/Schema';

const codemodConfigSchema = S.union(
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('piranha'),
		language: S.literal('java'),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('jscodeshift'),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('ts-morph'),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('repomod-engine'),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('recipe'),
		names: S.array(S.string),
	}),
);

const CODEMOD_REGISTRY_URL =
	'https://intuita-public.s3.us-west-1.amazonaws.com/codemod-registry';

export const downloadCodemod = async (name: string) => {
	// make the intuita directory
	const intuitaDirectoryPath = join(homedir(), '.intuita');

	await mkdir(intuitaDirectoryPath, { recursive: true });

	// make the codemod directory
	const hashDigest = createHash('ripemd160').update(name).digest('base64url');
	const codemodDirectoryPath = join(intuitaDirectoryPath, hashDigest);

	await mkdir(codemodDirectoryPath, { recursive: true });

	// download the config
	const configPath = join(codemodDirectoryPath, 'config.json');

	await downloadFile(
		`${CODEMOD_REGISTRY_URL}/${hashDigest}/config.json`,
		configPath,
	);

	const stringifiedConfig = await readFile(configPath, 'utf8');

	const parsedConfig = JSON.parse(stringifiedConfig);

	const config = S.parseSync(codemodConfigSchema)(parsedConfig);

	if (config.engine === 'piranha') {
		const rulesPath = join(codemodDirectoryPath, 'rules.toml');

		await downloadFile(
			`${CODEMOD_REGISTRY_URL}/${hashDigest}/rules.toml`,
			rulesPath,
		);
	}

	if (
		config.engine === 'jscodeshift' ||
		config.engine === 'repomod-engine' ||
		config.engine === 'ts-morph'
	) {
		const indexPath = join(codemodDirectoryPath, 'index.mjs.z');

		await downloadFile(
			`${CODEMOD_REGISTRY_URL}/${hashDigest}/index.mjs.z`,
			indexPath,
		);

		const compressedData = await readFile(indexPath);

		const inflatedData = await promisifiedInflate(compressedData);

		const path = join(codemodDirectoryPath, 'index.mjs');

		await writeFile(path, inflatedData);
	}

	if (config.engine === 'recipe') {
		for (const name in config.names) {
			await downloadCodemod(name);
		}
	}

	{
		const descriptionPath = join(codemodDirectoryPath, 'description.md');

		await downloadFile(
			`${CODEMOD_REGISTRY_URL}/${hashDigest}/description.md`,
			descriptionPath,
		);
	}
};
