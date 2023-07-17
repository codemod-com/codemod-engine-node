import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
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

type Codemod =
	| Readonly<{
			engine: 'recipe';
			directoryPath: string;
			codemods: ReadonlyArray<Codemod>;
	  }>
	| Readonly<{
			engine: 'jscodeshift' | 'repomod-engine' | 'ts-morph';
			directoryPath: string;
			indexPath: string;
	  }>
	| Readonly<{
			engine: 'piranha';
			directoryPath: string;
	  }>;

export const downloadCodemod = async (name: string): Promise<Codemod> => {
	// make the intuita directory
	const intuitaDirectoryPath = join(homedir(), '.intuita');

	await mkdir(intuitaDirectoryPath, { recursive: true });

	// make the codemod directory
	const hashDigest = createHash('ripemd160').update(name).digest('base64url');
	const directoryPath = join(intuitaDirectoryPath, hashDigest);

	await mkdir(directoryPath, { recursive: true });

	// download the config
	const configPath = join(directoryPath, 'config.json');

	const buffer = await downloadFile(
		`${CODEMOD_REGISTRY_URL}/${hashDigest}/config.json`,
		configPath,
	);

	const parsedConfig = JSON.parse(buffer.toString('utf8'));

	const config = S.parseSync(codemodConfigSchema)(parsedConfig);

	{
		const descriptionPath = join(directoryPath, 'description.md');

		try {
			await downloadFile(
				`${CODEMOD_REGISTRY_URL}/${hashDigest}/description.md`,
				descriptionPath,
			);
		} catch {
			// do nothing, descriptions might not exist
		}
	}

	if (config.engine === 'piranha') {
		const rulesPath = join(directoryPath, 'rules.toml');

		await downloadFile(
			`${CODEMOD_REGISTRY_URL}/${hashDigest}/rules.toml`,
			rulesPath,
		);

		return {
			engine: config.engine,
			directoryPath,
		};
	}

	if (
		config.engine === 'jscodeshift' ||
		config.engine === 'repomod-engine' ||
		config.engine === 'ts-morph'
	) {
		const deflatedIndexPath = join(directoryPath, 'index.mjs.z');

		const compressedData = await downloadFile(
			`${CODEMOD_REGISTRY_URL}/${hashDigest}/index.mjs.z`,
			deflatedIndexPath,
		);

		const inflatedData = await promisifiedInflate(compressedData);

		const indexPath = join(directoryPath, 'index.mjs');

		await writeFile(indexPath, inflatedData);

		return {
			engine: config.engine,
			indexPath,
			directoryPath,
		};
	}

	if (config.engine === 'recipe') {
		const codemods: Codemod[] = [];

		for (const name in config.names) {
			const codemod = await downloadCodemod(name);
			codemods.push(codemod);
		}

		return {
			engine: config.engine,
			codemods,
			directoryPath,
		};
	}

	throw new Error('Unsupported engine');
};
