import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as S from '@effect/schema/Schema';
import { handleListNamesCommand } from './handleListCliCommand.js';
import { downloadCodemod } from './downloadCodemod.js';
import { runCodemod } from './new/runCodemod.js';

const codemodSettingsSchema = S.struct({
	name: S.string,
});

export type CodemodSettings = S.To<typeof codemodSettingsSchema>;

const DEFAULT_INCLUDE_PATTERNS = ['**/*.*(ts|tsx)'] as const;
const DEFAULT_EXCLUDE_PATTERNS = ['**/node_modules/'] as const;
const DEFAULT_INPUT_DIRECTORY_PATH = process.cwd();
const DEFAULT_FILE_LIMIT = 1000;
const DEFAULT_THREAD_COUNT = 4;
const DEFAULT_USE_PRETTIER = false;
const DEFAULT_USE_JSON = false;
const DEFAULT_USE_CACHE = false;

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
	threadCount: S.optional(
		S.number.pipe(S.int()).pipe(S.positive()),
	).withDefault(() => DEFAULT_THREAD_COUNT),
	usePrettier: S.optional(S.boolean).withDefault(() => DEFAULT_USE_PRETTIER),
	useJson: S.optional(S.boolean).withDefault(() => DEFAULT_USE_JSON),
	useCache: S.optional(S.boolean).withDefault(() => DEFAULT_USE_CACHE),
});

export type FlowSettings = S.To<typeof flowSettingsSchema>;

export const executeMainThread = async () => {
	const argv = await Promise.resolve(
		yargs(hideBin(process.argv))
			.scriptName('intuita')
			.command('run', 'run a codemod', (y) =>
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
					// .option('sourcePath', {
					// 	type: 'string',
					// 	description: 'Path to the custom codemod',
					// })
					// .option('engine', {
					// 	type: 'string',
					// 	description: 'Hint for the custom codemod engine',
					// })
					.option('fileLimit', {
						type: 'number',
						description: 'File limit for processing',
						default: 1000,
					})
					.option('threadCount', {
						type: 'number',
						description: 'Number of threads to use',
						default: 1,
					})
					.option('usePrettier', {
						type: 'boolean',
						description: 'Format output with Prettier',
						default: DEFAULT_USE_PRETTIER,
					})
					.option('useJson', {
						type: 'boolean',
						description: 'Respond with JSON',
						default: DEFAULT_USE_JSON,
					})
					.option('useCache', {
						type: 'boolean',
						description: 'Use cache for HTTP(S) requests',
						default: DEFAULT_USE_JSON,
					})
					.option('dryRun', {
						type: 'boolean',
						description: 'Perform a dry run',
					})
					.option('outputDirectoryPath', {
						type: 'string',
						description: 'Output directory path for dry-run only',
					})
					.demandOption('name'),
			)
			.command('listNames', 'list the codemod names', (y) =>
				y.option('json', {
					type: 'boolean',
					description: 'Respond with JSON',
					default: false,
				}),
			)
			.command('getMetadataPath', 'list the codemod names', (y) =>
				y
					.option('name', {
						type: 'string',
						description: 'Name of the codemod in the registry',
					})
					.demandOption('name'),
			)
			.help()
			.version().argv,
	);

	if (String(argv._) === 'listNames') {
		await handleListNamesCommand(argv.json);

		return;
	}

	if (String(argv._) === 'getMetadataPath') {
		const codemod = await downloadCodemod(argv.name, false);

		console.log(codemod.directoryPath);

		return;
	}

	if (String(argv._) === 'run') {
		const codemodSettings = S.parseSync(codemodSettingsSchema)(argv);
		const flowSettings = S.parseSync(flowSettingsSchema)(argv);

		const codemod = await downloadCodemod(
			codemodSettings.name,
			flowSettings.useCache,
		);

		await runCodemod(codemod, flowSettings);
	}
};
