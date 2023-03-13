import fastGlob from 'fast-glob';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { NewGroup, oldGroupCodec, newGroupCodec } from './groups';
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
	const {
		pattern,
		group,
		filePath: codemodFilePath,
		outputDirectoryPath,
		limit,
		workerThreadCount,
	} = await Promise.resolve<{
		pattern: ReadonlyArray<string>;
		group?: ReadonlyArray<string>;
		filePath?: string;
		outputDirectoryPath: string;
		limit?: number;
		workerThreadCount?: number;
	}>(
		yargs(hideBin(process.argv))
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
				describe: 'Pass the limit for the number of files to inspect',
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
				alias: 'o',
				describe: 'Pass the number of worker threads to execute',
				type: 'number',
			})
			.demandOption(
				['pattern', 'outputDirectoryPath'],
				'Please provide the pattern argument to work with nora-node-engine',
			)
			.help()
			.alias('help', 'h').argv,
	);

	const newGroups = buildNewGroups(group ?? null);

	const filePaths = await fastGlob(pattern.slice());

	const newFilePaths = filePaths.slice(
		0,
		Math.min(limit ?? 0, filePaths.length),
	);

	new WorkerThreadManager(
		workerThreadCount ?? 1,
		newFilePaths,
		codemodFilePath ?? null,
		newGroups,
		outputDirectoryPath,
	);
};
