import * as readline from 'node:readline';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as S from '@effect/schema/Schema';
import { handleListNamesCommand } from './handleListCliCommand.js';
import { CodemodDownloader } from './downloadCodemod.js';
import { Printer } from './printer.js';
import { handleLearnCliCommand } from './handleLearnCliCommand.js';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { DEFAULT_USE_CACHE } from './constants.js';
import {
	buildOptions,
	buildUseCacheOption,
	buildUseJsonOption,
} from './buildOptions.js';
import { Runner } from './runner.js';
import * as fs from 'fs';
import { IFs } from 'memfs';
import { loadRepositoryConfiguration } from './repositoryConfiguration.js';
import { codemodSettingsSchema } from './schemata/codemodSettingsSchema.js';
import { flowSettingsSchema } from './schemata/flowSettingsSchema.js';
import { runSettingsSchema } from './schemata/runSettingsSchema.js';
import { buildArgumentRecord } from './buildArgumentRecord.js';
import { FileDownloadService } from './fileDownloadService.js';
import Axios from 'axios';

export const executeMainThread = async () => {
	const interfaze = readline.createInterface(process.stdin);

	const lineHandler = (line: string): void => {
		if (line === 'shutdown') {
			interfaze.off('line', lineHandler);

			process.exit(0);
		}
	};

	interfaze.on('line', lineHandler);

	process.stdin.unref();

	const argv = await Promise.resolve(
		yargs(hideBin(process.argv))
			.scriptName('intuita')
			.command('*', 'runs a codemod or recipe', (y) => buildOptions(y))
			.command(
				'runOnPreCommit [files...]',
				'run pre-commit codemods against staged files passed positionally',
				(y) => buildUseCacheOption(y),
			)
			.command(
				'list',
				'lists all the codemods & recipes in the public registry',
				(y) =>
					buildUseJsonOption(y).option('useCache', {
						type: 'boolean',
						description: 'Use cache for HTTP(S) requests',
						default: DEFAULT_USE_CACHE,
					}),
			)
			.command(
				'syncRegistry',
				'syncs all the codemods from the registry',
				(y) => buildUseJsonOption(y),
			)
			.command(
				'learn',
				'exports the current `git diff` in a file to before/after panels in codemod studio',
				(y) =>
					buildUseJsonOption(y).option('targetPath', {
						type: 'string',
						description: 'Input file path',
					}),
			)
			.help()
			.version().argv,
	);

	const fetchBuffer = async (url: string) => {
		const { data } = await Axios.get(url, {
			responseType: 'arraybuffer',
		});

		return Buffer.from(data);
	};

	const fileDownloadService = new FileDownloadService(
		argv.useCache,
		fetchBuffer,
		() => Date.now(),
		fs as unknown as IFs,
	);

	if (String(argv._) === 'list') {
		const printer = new Printer(argv.useJson);

		try {
			await handleListNamesCommand(fileDownloadService, printer);
		} catch (error) {
			if (!(error instanceof Error)) {
				return;
			}

			printer.log({ kind: 'error', message: error.message });
		}

		return;
	}

	if (String(argv._) === 'syncRegistry') {
		const printer = new Printer(argv.useJson);

		const codemodDownloader = new CodemodDownloader(
			printer,
			join(homedir(), '.intuita'),
			argv.useCache,
			fileDownloadService,
		);

		try {
			await codemodDownloader.syncRegistry();
		} catch (error) {
			if (!(error instanceof Error)) {
				return;
			}

			printer.log({ kind: 'error', message: error.message });
		}

		return;
	}

	if (String(argv._) === 'learn') {
		const printer = new Printer(argv.useJson);

		try {
			await handleLearnCliCommand(printer, argv.targetPath ?? null);
		} catch (error) {
			if (!(error instanceof Error)) {
				return;
			}

			printer.log({ kind: 'error', message: error.message });
		}

		return;
	}

	const intuitaDirectoryPath = join(
		String(argv._) === 'runOnPreCommit' ? process.cwd() : homedir(),
		'.intuita',
	);

	const codemodSettings = S.parseSync(codemodSettingsSchema)(argv);
	const flowSettings = S.parseSync(flowSettingsSchema)(argv);
	const runSettings = S.parseSync(runSettingsSchema)(argv);
	const argumentRecord = buildArgumentRecord(argv);

	const lastArgument = argv._[argv._.length - 1];

	const name = typeof lastArgument === 'string' ? lastArgument : null;

	const printer = new Printer(flowSettings.useJson);

	const codemodDownloader = new CodemodDownloader(
		printer,
		intuitaDirectoryPath,
		argv.useCache,
		fileDownloadService,
	);

	const runner = new Runner(
		fs as unknown as IFs,
		printer,
		codemodDownloader,
		loadRepositoryConfiguration,
		codemodSettings,
		flowSettings,
		runSettings,
		argumentRecord,
		name,
		process.cwd(),
	);

	await runner.run();
};
