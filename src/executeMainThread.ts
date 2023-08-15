import * as readline from 'node:readline';
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
import { Message } from './messages.js';
import { handleLearnCliCommand } from './handleLearnCliCommand.js';

const codemodSettingsSchema = S.union(
	S.struct({
		_: S.array(S.string),
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
	include: S.optional(S.array(S.string)).withDefault(
		() => DEFAULT_INCLUDE_PATTERNS,
	),
	exclude: S.optional(S.array(S.string)).withDefault(
		() => DEFAULT_EXCLUDE_PATTERNS,
	),
	targetPath: S.optional(S.string).withDefault(
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
			.command('*', 'runs a codemod or recipe', (y) =>
				y
					.option('include', {
						type: 'string',
						array: true,
						description: 'Glob pattern(s) for files to include',
						default: DEFAULT_INCLUDE_PATTERNS,
					})
					.option('exclude', {
						type: 'string',
						array: true,
						description: 'Glob pattern(s) for files to exclude',
						default: DEFAULT_EXCLUDE_PATTERNS,
					})
					.option('targetPath', {
						type: 'string',
						description: 'Input directory path',
						default: DEFAULT_INPUT_DIRECTORY_PATH,
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
			.command(
				'list',
				'lists all the codemods & recipes in the public registry',
				(y) =>
					y
						.option('useJson', {
							type: 'boolean',
							description: 'Respond with JSON',
							default: DEFAULT_USE_JSON,
						})
						.option('useCache', {
							type: 'boolean',
							description: 'Use cache for HTTP(S) requests',
							default: DEFAULT_USE_CACHE,
						}),
			)
			.command(
				'syncRegistry',
				'syncs all the codemods from the registry',
				(y) =>
					y.option('useJson', {
						type: 'boolean',
						description: 'Respond with JSON',
						default: DEFAULT_USE_JSON,
					}),
			)
			.command(
				'learn',
				'exports the current `git diff` in a file to before/after panels in codemod studio',
				(y) =>
					y
						.option('useJson', {
							type: 'boolean',
							description: 'Respond with JSON',
							default: DEFAULT_USE_JSON,
						})
						.option('targetPath', {
							type: 'string',
							description: 'Input file path',
						}),
			)
			.help()
			.version().argv,
	);

	if (String(argv._) === 'list') {
		const printer = new Printer(argv.useJson);

		try {
			await handleListNamesCommand(printer, argv.useCache);
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

		const codemodDownloader = new CodemodDownloader(printer);

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

	const printer = new Printer(argv.useJson);

	try {
		const codemodDownloader = new CodemodDownloader(printer);

		const codemodSettings = S.parseSync(codemodSettingsSchema)(argv);
		const flowSettings = S.parseSync(flowSettingsSchema)(argv);
		const runSettings = S.parseSync(runSettingsSchema)(argv);

		const lastArgument = argv._[argv._.length - 1];

		const name = typeof lastArgument === 'string' ? lastArgument : null;

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

		const handleMessage = async (message: Message) => {
			printer.log(message);
		};

		if (
			'sourcePath' in codemodSettings &&
			'codemodEngine' in codemodSettings
		) {
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
				handleMessage,
			);
			return;
		}

		if (name !== null) {
			printer.info(
				'Executing the "%s" codemod against "%s"',
				name,
				flowSettings.targetPath,
			);

			const codemod = await codemodDownloader.download(
				name,
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
				handleMessage,
			);
		}
	} catch (error) {
		if (!(error instanceof Error)) {
			return;
		}

		printer.log({ kind: 'error', message: error.message });
	}
};
