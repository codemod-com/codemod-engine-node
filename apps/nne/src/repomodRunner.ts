import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { Repomod, executeRepomod } from '@intuita-inc/repomod-engine-api';
import { buildApi } from '@intuita-inc/repomod-engine-api';
import { UnifiedFileSystem } from '@intuita-inc/repomod-engine-api';
import { FileSystemManager } from '@intuita-inc/repomod-engine-api';
import jscodeshift from 'jscodeshift';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';
import hastToBabelAst from '@svgr/hast-util-to-babel-ast';

type Dependencies = Readonly<{
	jscodeshift: typeof jscodeshift;
	unified: typeof unified;
	rehypeParse: typeof rehypeParse;
	hastToBabelAst: typeof hastToBabelAst;
}>;
import { ModCommand } from './modCommands.js';

export const runRepomod = async (
	repomod: Repomod<Dependencies>,
	inputPath: string,
): Promise<readonly ModCommand[]> => {
	const fileSystemManager = new FileSystemManager(
		fsPromises.readdir,
		fsPromises.readFile,
		fsPromises.stat,
	);
	const unifiedFileSystem = new UnifiedFileSystem(fs, fileSystemManager);

	const api = buildApi<Dependencies>(unifiedFileSystem, () => ({
		jscodeshift,
		unified,
		rehypeParse,
		hastToBabelAst,
	}));

	const externalFileCommands = await executeRepomod(
		api,
		repomod,
		inputPath,
		{},
	);

	return Promise.all(
		externalFileCommands.map(async (externalFileCommand) => {
			if (externalFileCommand.kind === 'upsertFile') {
				try {
					await fsPromises.stat(externalFileCommand.path);

					return {
						kind: 'updateFile',
						oldPath: externalFileCommand.path,
						oldData: '', // TODO get the old data from the repomod
						newData: externalFileCommand.data,
					};
				} catch (error) {
					return {
						kind: 'createFile',
						newPath: externalFileCommand.path,
						newData: externalFileCommand.data,
					};
				}
			}

			return {
				kind: 'deleteFile',
				oldPath: externalFileCommand.path,
			};
		}),
	);
};
