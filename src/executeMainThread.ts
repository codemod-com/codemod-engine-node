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
import { ArgumentRecord } from './argumentRecord.js';
import { IFs } from 'memfs';
import { buildSafeArgumentRecord } from './safeArgumentRecord.js';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
	DEFAULT_EXCLUDE_PATTERNS,
	DEFAULT_FILE_LIMIT,
	DEFAULT_INCLUDE_PATTERNS,
	DEFAULT_INPUT_DIRECTORY_PATH,
	DEFAULT_THREAD_COUNT,
	DEFAULT_USE_CACHE,
	DEFAULT_USE_JSON,
	DEFAULT_USE_PRETTIER,
} from './constants.js';
import { buildOptions, buildUseJsonOption } from './buildOptions.js';

const codemodSettingsSchema = S.union(
	S.struct({
		_: S.array(S.string),
	}),
	S.struct({
		sourcePath: S.string,
		codemodEngine: S.union(
			S.literal('jscodeshift'),
			S.literal('repomod-engine'),
			S.literal('filemod'),
			S.literal('ts-morph'),
		),
	}),
);

export type CodemodSettings = S.To<typeof codemodSettingsSchema>;

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
	files: S.optional(S.array(S.string)),
	fileLimit: S.optional(
		S.number.pipe(S.int()).pipe(S.positive()),
	).withDefault(() => DEFAULT_FILE_LIMIT),
	usePrettier: S.optional(S.boolean).withDefault(() => DEFAULT_USE_PRETTIER),
	useCache: S.optional(S.boolean).withDefault(() => DEFAULT_USE_CACHE),
	useJson: S.optional(S.boolean).withDefault(() => DEFAULT_USE_JSON),
	threadCount: S.optional(S.number).withDefault(() => DEFAULT_THREAD_COUNT),
});

export type FlowSettings = S.To<typeof flowSettingsSchema>;

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
			.command('*', 'runs a codemod or recipe', (y) => buildOptions(y))
			.command(
				'run [files...]',
				'run a particular codemod against files passed positionally',
				(y) => buildOptions(y),
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

		const codemodDownloader = new CodemodDownloader(
			printer,
			join(homedir(), '.intuita'),
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
		String(argv._) === 'runOnFiles' ? process.cwd() : homedir(),
		'.intuita',
	);

	const printer = new Printer(argv.useJson);

	try {
		const codemodDownloader = new CodemodDownloader(
			printer,
			intuitaDirectoryPath,
		);

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

		const argumentRecord: {
			[P in keyof ArgumentRecord]: ArgumentRecord[P];
		} = {};

		Object.keys(argv)
			.filter((arg) => arg.startsWith('arg:'))
			.forEach((arg) => {
				const key = arg.slice(4);
				const value = argv[arg];

				if (S.is(S.number)(value)) {
					argumentRecord[key] = value;
					return;
				}

				if (!S.is(S.string)(value)) {
					return;
				}

				if (value === 'true') {
					argumentRecord[key] = true;
					return;
				}

				if (value === 'false') {
					argumentRecord[key] = false;
					return;
				}

				argumentRecord[key] = value;
			});

		if (
			'sourcePath' in codemodSettings &&
			'codemodEngine' in codemodSettings
		) {
			const codemod = {
				source: 'fileSystem' as const,
				engine: codemodSettings.codemodEngine,
				indexPath: codemodSettings.sourcePath,
			};

			const safeArgumentRecord = buildSafeArgumentRecord(
				codemod,
				argumentRecord,
			);

			await runCodemod(
				fs as unknown as IFs,
				printer,
				codemod,
				flowSettings,
				runSettings,
				handleCommand,
				handleMessage,
				safeArgumentRecord,
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

			const safeArgumentRecord = buildSafeArgumentRecord(
				codemod,
				argumentRecord,
			);

			await runCodemod(
				fs as unknown as IFs,
				printer,
				codemod,
				flowSettings,
				runSettings,
				handleCommand,
				handleMessage,
				safeArgumentRecord,
			);
		}
	} catch (error) {
		if (!(error instanceof Error)) {
			return;
		}

		printer.log({ kind: 'error', message: error.message });
	}
};
