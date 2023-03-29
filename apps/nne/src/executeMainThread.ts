import { Repomod } from '@intuita-inc/repomod-engine-api/dist/repomod';
import fastGlob from 'fast-glob';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { NewGroup, oldGroupCodec, newGroupCodec } from './groups';
import { runRepomod } from './repomodRunner';
import { WorkerThreadManager } from './workerThreadManager';

const buildNewGroups = (
	groups: ReadonlyArray<string> | null,
): ReadonlyArray<NewGroup> => {
	if (!groups) {
		return [];
	}

	return groups.map((group): NewGroup => {
		const isOldGroup = oldGroupCodec.is(group);

		if (isOldGroup) {
			switch (group) {
				case 'nextJs':
					return 'next_13';
				case 'mui':
					return 'mui';
				case 'reactrouterv4':
					return 'react-router_4';
				case 'reactrouterv6':
					return 'react-router_6';
				case 'immutablejsv4':
					return 'immutable_4';
				case 'immutablejsv0':
					return 'immutable_0';
			}
		}

		const isNewGroup = newGroupCodec.is(group);

		if (isNewGroup) {
			return group;
		}

		throw new Error(
			`The group "${group}" is neither the old group nor the new group`,
		);
	});
};

export const executeMainThread = async () => {
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
					.option('group', {
						alias: 'g',
						describe: 'Pass the group(s) of codemods for execution',
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
					.demandOption(
						['repomodFilePath', 'inputPath', 'outputDirectoryPath'],
						'Please provide the repomodFilePath and outputDirectoryPath argument to work with codemod-engine-node',
					);
			})
			.help()
			.alias('help', 'h').argv,
	);

	if (String(argv._) === 'repomod') {
		const { repomodFilePath, inputPath, outputDirectoryPath } = argv;

		const source = readFileSync(repomodFilePath, {
			encoding: 'utf8',
		});

		const { outputText } = ts.transpileModule(source, {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				noEmitOnError: false,
			},
		});

		type Exports =
			| {
					__esModule?: true;
					default?: unknown;
			  }
			// eslint-disable-next-line @typescript-eslint/ban-types
			| Function;

		const exports: Exports = {};
		const module = { exports };

		const keys = ['module', 'exports'];
		const values = [module, exports];

		new Function(keys.join(), outputText).apply(exports, values);

		if (exports.__esModule && typeof exports.default === 'object') {
			const repomod = exports.default as Repomod<{}>;

			const x = await runRepomod(repomod, inputPath);

			console.log(x);
		}

		throw new Error('Could not compile the provided codemod');
	}

	const newGroups = buildNewGroups(argv.group ?? null);

	const filePaths = await fastGlob(argv.pattern.slice());

	const newFilePaths = filePaths.slice(
		0,
		Math.min(argv.limit ?? filePaths.length, filePaths.length),
	);

	new WorkerThreadManager(
		workerThreadCount ?? 1,
		newFilePaths,
		codemodFilePath ?? null,
		newGroups,
		outputDirectoryPath,
	);
};
