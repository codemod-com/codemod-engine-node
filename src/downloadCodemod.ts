import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PrinterBlueprint } from './printer.js';
import { Codemod } from './codemod.js';
import * as tar from 'tar';

import * as S from '@effect/schema/Schema';
import Axios from 'axios';
import { codemodConfigSchema } from './schemata/codemodConfigSchema.js';
import { FileDownloadServiceBlueprint } from './fileDownloadService.js';

const CODEMOD_REGISTRY_URL =
	'https://intuita-public.s3.us-west-1.amazonaws.com/codemod-registry';

export type CodemodDownloaderBlueprint = Readonly<{
	syncRegistry: () => Promise<void>;
	download(
		name: string,
		cache: boolean,
	): Promise<Codemod & { source: 'registry' }>;
}>;

export class CodemodDownloader implements CodemodDownloaderBlueprint {
	public constructor(
		private readonly __printer: PrinterBlueprint,
		private readonly __intuitaDirectoryPath: string,
		protected readonly _cacheUsed: boolean,
		protected readonly _fileDownloadService: FileDownloadServiceBlueprint,
	) {}

	public async syncRegistry() {
		this.__printer.info(
			'Syncing the Codemod Registry into %s',
			this.__intuitaDirectoryPath,
		);

		await mkdir(this.__intuitaDirectoryPath, { recursive: true });

		const getResponse = await Axios.get(
			`${CODEMOD_REGISTRY_URL}/registry.tar.gz`,
			{
				responseType: 'arraybuffer',
			},
		);

		const buffer = Buffer.from(getResponse.data);

		const extractStream = tar.extract({
			cwd: this.__intuitaDirectoryPath,
			newer: false,
			keep: false,
		});

		return new Promise<void>((resolve, reject) => {
			extractStream.once('error', (error) => {
				reject(error);
			});

			extractStream.once('finish', () => {
				resolve();
			});

			extractStream.write(buffer);
			extractStream.end();
		});
	}

	public async download(
		name: string,
	): Promise<Codemod & { source: 'registry' }> {
		this.__printer.info(
			'Downloading the "%s" codemod, %susing cache',
			name,
			this._cacheUsed ? '' : 'not ',
		);

		await mkdir(this.__intuitaDirectoryPath, { recursive: true });

		// make the codemod directory
		const hashDigest = createHash('ripemd160')
			.update(name)
			.digest('base64url');

		const directoryPath = join(this.__intuitaDirectoryPath, hashDigest);

		await mkdir(directoryPath, { recursive: true });

		// download the config
		const configPath = join(directoryPath, 'config.json');

		const buffer = await this._fileDownloadService.download(
			`${CODEMOD_REGISTRY_URL}/${hashDigest}/config.json`,
			configPath,
		);

		const parsedConfig = JSON.parse(buffer.toString('utf8'));

		const config = S.parseSync(codemodConfigSchema)(parsedConfig);

		{
			const descriptionPath = join(directoryPath, 'description.md');

			try {
				await this._fileDownloadService.download(
					`${CODEMOD_REGISTRY_URL}/${hashDigest}/description.md`,
					descriptionPath,
				);
			} catch {
				// do nothing, descriptions might not exist
			}
		}

		if (config.engine === 'piranha') {
			const rulesPath = join(directoryPath, 'rules.toml');

			await this._fileDownloadService.download(
				`${CODEMOD_REGISTRY_URL}/${hashDigest}/rules.toml`,
				rulesPath,
			);

			return {
				source: 'registry',
				name,
				engine: config.engine,
				directoryPath,
				arguments: config.arguments,
			};
		}

		if (
			config.engine === 'jscodeshift' ||
			config.engine === 'repomod-engine' ||
			config.engine === 'filemod' ||
			config.engine === 'ts-morph'
		) {
			const indexPath = join(directoryPath, 'index.cjs');

			const data = await this._fileDownloadService.download(
				`${CODEMOD_REGISTRY_URL}/${hashDigest}/index.cjs`,
				indexPath,
			);

			await writeFile(indexPath, data);

			return {
				source: 'registry',
				name,
				engine: config.engine,
				indexPath,
				directoryPath,
				arguments: config.arguments,
			};
		}

		if (config.engine === 'recipe') {
			const codemods: Codemod[] = [];

			for (const name of config.names) {
				const codemod = await this.download(name);
				codemods.push(codemod);
			}

			return {
				source: 'registry',
				name,
				engine: config.engine,
				codemods,
				directoryPath,
				arguments: config.arguments,
			};
		}

		throw new Error('Unsupported engine');
	}
}
