import fastGlob from 'fast-glob';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { handleListCliCommand } from './handleListCliCommand.js';
import { handleRepomodCliCommand } from './handleRepomodCliCommand.js';
import { WorkerThreadManager } from './workerThreadManager.js';
import { buildExecutionId } from './buildExecutionId.js';

export const executeMainThread = async () => {
	const executionId = buildExecutionId();

	const argv = await Promise.resolve(
		yargs(hideBin(process.argv))
			.command('*', 'the default command', (y) => {
				return y
					.option('pattern', {
						alias: 'p',
						describe: 'Pass the glob pattern for file paths',
						array: true,
						type: 'string',
					})
					.option('codemodHashDigests', {
						alias: 'c',
						describe: 'Pass the codemod hash digests for execution',
						array: true,
						type: 'string',
					})
					.option('filePath', {
						alias: 'f',
						describe:
							'Pass the file path of a single codemod for execution',
						array: false,
						type: 'string',
					})
					.option('limit', {
						alias: 'l',
						describe:
							'Pass the limit for the number of files to inspect',
						array: false,
						type: 'number',
					})
					.option('outputDirectoryPath', {
						alias: 'o',
						describe:
							'Pass the output directory path to save output files within in',
						type: 'string',
					})
					.option('workerThreadCount', {
						alias: 'w',
						describe:
							'Pass the number of worker threads to execute',
						type: 'number',
					})
					.option('formatWithPrettier', {
						describe:
							'Pass whether to format the output files with Prettier or not',
						type: 'boolean',
					})
					.demandOption(
						['pattern', 'outputDirectoryPath'],
						'Please provide the pattern argument to work with nora-node-engine',
					);
			})
			.command('repomod', 'run the repomod', (y) => {
				return y
					.option('repomodFilePath', {
						alias: 'f',
						describe:
							'Pass the file path of a single repomod for execution',
						array: false,
						type: 'string',
					})
					.option('inputPath', {
						alias: 'i',
						describe:
							'Pass the input path for the repomod execution',
						type: 'string',
					})
					.option('outputDirectoryPath', {
						alias: 'o',
						describe:
							'Pass the output directory path to save output files within in',
						type: 'string',
					})
					.option('formatWithPrettier', {
						describe:
							'Pass whether to format the output files with Prettier or not',
						type: 'boolean',
					})
					.demandOption(
						['repomodFilePath', 'inputPath', 'outputDirectoryPath'],
						'Please provide the repomodFilePath and outputDirectoryPath argument to work with codemod-engine-node',
					);
			})
			.command('list', 'list the codemods')
			.help()
			.alias('help', 'h').argv,
	);

	if (String(argv._) === 'list') {
		handleListCliCommand();

		return;
	}

	const formatWithPrettier = argv.formatWithPrettier ?? false;

	if (String(argv._) === 'repomod') {
		await handleRepomodCliCommand(
			{ ...argv, formatWithPrettier },
			executionId,
		);

		return;
	}

	// https://github.com/yargs/yargs/blob/main/docs/tricks.md#quotes
	// if the codemod hash digests are created with `'"..."', for some reason
	// yargs does not strip ", so we do it manually here
	const codemodHashDigests = (argv.codemodHashDigests ?? []).map(
		(hashDigest) => hashDigest.replace(/"/g, ''),
	);
	const filePaths = await fastGlob(argv.pattern.slice());

	const newFilePaths = filePaths.slice(
		0,
		Math.min(argv.limit ?? filePaths.length, filePaths.length),
	);

	new WorkerThreadManager(
		argv.workerThreadCount ?? 1,
		newFilePaths,
		argv.filePath ?? null,
		argv.outputDirectoryPath,
		codemodHashDigests,
		executionId,
		formatWithPrettier,
	);
};
