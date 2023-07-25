import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as S from '@effect/schema/Schema';
import { handleListNamesCommand } from './handleListCliCommand.js';
import { CodemodDownloader } from './downloadCodemod.js';
import { runCodemod } from './runCodemod.js';
import { Printer } from './printer.js';
import * as fs from 'fs';
import {
	FormattedFileCommand,
	buildPrinterMessageUponCommand,
	modifyFileSystemUponCommand,
} from './fileCommands.js';

const codemodSettingsSchema = S.union(
	S.struct({
		name: S.string,
	}),
	S.struct({
		sourcePath: S.string,
		codemodEngine: S.union(
			S.literal('jscodeshift'),
			S.literal('repomod-engine'),
			S.literal('ts-morph'),
		),
	}),
);

export type CodemodSettings = S.To<typeof codemodSettingsSchema>;

const DEFAULT_INCLUDE_PATTERNS = ['**/*.*{ts,tsx,js,jsx,mjs,cjs,mdx}'] as const;
const DEFAULT_EXCLUDE_PATTERNS = ['**/node_modules/**/*.*'] as const;
const DEFAULT_INPUT_DIRECTORY_PATH = process.cwd();
const DEFAULT_FILE_LIMIT = 1000;
const DEFAULT_USE_PRETTIER = false;
const DEFAULT_USE_CACHE = false;
const DEFAULT_USE_JSON = false;
const DEFAULT_THREAD_COUNT = 4;

const flowSettingsSchema = S.struct({
	includePattern: S.optional(S.array(S.string)).withDefault(
		() => DEFAULT_INCLUDE_PATTERNS,
	),
	excludePattern: S.optional(S.array(S.string)).withDefault(
		() => DEFAULT_EXCLUDE_PATTERNS,
	),
	inputDirectoryPath: S.optional(S.string).withDefault(
		() => DEFAULT_INPUT_DIRECTORY_PATH,
	),
	fileLimit: S.optional(
		S.number.pipe(S.int()).pipe(S.positive()),
	).withDefault(() => DEFAULT_FILE_LIMIT),
	usePrettier: S.optional(S.boolean).withDefault(() => DEFAULT_USE_PRETTIER),
	useCache: S.optional(S.boolean).withDefault(() => DEFAULT_USE_CACHE),
	useJson: S.optional(S.boolean).withDefault(() => DEFAULT_USE_JSON),
	threadCount: S.optional(S.number).withDefault(() => DEFAULT_THREAD_COUNT),
});

export type FlowSettings = S.To<typeof flowSettingsSchema>;

const DEFAULT_DRY_RUN = false;

const runSettingsSchema = S.union(
	S.struct({
		dryRun: S.literal(false),
	}),
	S.struct({
		dryRun: S.literal(true),
		outputDirectoryPath: S.string,
	}),
);

export type RunSettings = S.To<typeof runSettingsSchema>;

export const executeMainThread = async () => {
	const argv = await Promise.resolve(
		yargs(hideBin(process.argv))
			.scriptName('intuita')
			.command('*', 'run a codemod', (y) =>
				y
					.option('includePattern', {
						type: 'string',
						array: true,
						description: 'Glob pattern(s) for files to include',
						default: DEFAULT_INCLUDE_PATTERNS,
					})
					.option('excludePattern', {
						type: 'string',
						array: true,
						description: 'Glob pattern(s) for files to exclude',
						default: DEFAULT_EXCLUDE_PATTERNS,
					})
					.option('inputDirectoryPath', {
						type: 'string',
						description: 'Input directory path',
						default: DEFAULT_INPUT_DIRECTORY_PATH,
					})
					.option('name', {
						type: 'string',
						description: 'Name of the codemod in the registry',
					})
					.option('sourcePath', {
						type: 'string',
						description: 'Source path of the local codemod to run',
					})
					.option('codemodEngine', {
						type: 'string',
						description:
							'The engine to use with the local codemod: "jscodeshift", "ts-morph", "repomod-engine"',
					})
					.option('fileLimit', {
						type: 'number',
						description: 'File limit for processing',
						default: 1000,
					})
					.option('usePrettier', {
						type: 'boolean',
						description: 'Format output with Prettier',
						default: DEFAULT_USE_PRETTIER,
					})
					.option('useCache', {
						type: 'boolean',
						description: 'Use cache for HTTP(S) requests',
						default: DEFAULT_USE_CACHE,
					})
					.option('useJson', {
						type: 'boolean',
						description: 'Use JSON responses in the console',
						default: DEFAULT_USE_JSON,
					})
					.option('threadCount', {
						type: 'number',
						description: 'Number of worker threads',
						default: DEFAULT_THREAD_COUNT,
					})
					.option('dryRun', {
						type: 'boolean',
						description: 'Perform a dry run',
						default: DEFAULT_DRY_RUN,
					})
					.option('outputDirectoryPath', {
						type: 'string',
						description: 'Output directory path for dry-run only',
					}),
			)
			.command('listNames', 'list the codemod names', (y) =>
				y.option('useJson', {
					type: 'boolean',
					description: 'Respond with JSON',
					default: DEFAULT_USE_JSON,
				}),
			)
			.command(
				'getMetadataPath',
				'get the metadata path for a json',
				(y) =>
					y
						.option('name', {
							type: 'string',
							description: 'Name of the codemod in the registry',
						})
						.option('useJson', {
							type: 'boolean',
							description: 'Respond with JSON',
							default: DEFAULT_USE_JSON,
						})
						.demandOption('name'),
			)
			.help()
			.version().argv,
	);

	if (String(argv._) === 'listNames') {
		const printer = new Printer(argv.useJson);

		try {
			await handleListNamesCommand(printer);
		} catch (error) {
			if (!(error instanceof Error)) {
				return;
			}

			printer.error(error);
		}

		return;
	}

	if (String(argv._) === 'getMetadataPath') {
		const printer = new Printer(argv.useJson);

		try {
			const codemodDownloader = new CodemodDownloader(printer);

			const codemod = await codemodDownloader.download(argv.name, false);

			printer.log({
				kind: 'metadataPath',
				path: codemod.directoryPath,
			});
		} catch (error) {
			if (!(error instanceof Error)) {
				return;
			}

			printer.error(error);
		}
	}

	const printer = new Printer(argv.useJson);

	try {
		const codemodDownloader = new CodemodDownloader(printer);

		const codemodSettings = S.parseSync(codemodSettingsSchema)(argv);
		const flowSettings = S.parseSync(flowSettingsSchema)(argv);
		const runSettings = S.parseSync(runSettingsSchema)(argv);

		const handleCommand = async (
			command: FormattedFileCommand,
		): Promise<void> => {
			await modifyFileSystemUponCommand(
				// @ts-expect-error type inconsistency
				fs,
				runSettings,
				command,
			);

			const printerMessage = buildPrinterMessageUponCommand(
				runSettings,
				command,
			);

			if (printerMessage) {
				printer.log(printerMessage);
			}
		};

		if ('name' in codemodSettings) {
			printer.info(
				'Executing the "%s" codemod against "%s"',
				codemodSettings.name,
				flowSettings.inputDirectoryPath,
			);

			const codemod = await codemodDownloader.download(
				codemodSettings.name,
				flowSettings.useCache,
			);

			await runCodemod(
				// @ts-expect-error type inconsistency
				fs,
				printer,
				codemod,
				flowSettings,
				runSettings,
				handleCommand,
			);
		} else {
			const codemod = {
				source: 'fileSystem' as const,
				engine: codemodSettings.codemodEngine,
				indexPath: codemodSettings.sourcePath,
			};

			await runCodemod(
				// @ts-expect-error type inconsistency
				fs,
				printer,
				codemod,
				flowSettings,
				runSettings,
				handleCommand,
			);
		}
	} catch (error) {
		if (!(error instanceof Error)) {
			return;
		}

		printer.error(error);
	}
};
