import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import {
	Repomod,
	executeRepomod,
} from '@intuita-inc/repomod-engine-api/dist/repomod';
import { buildApi } from '@intuita-inc/repomod-engine-api/dist/api';
import { UnifiedFileSystem } from '@intuita-inc/repomod-engine-api/dist/unifiedFileSystem';
import { FileSystemManager } from '@intuita-inc/repomod-engine-api/dist/fileSystemManager';
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
import { ModCommand } from './modCommands';

export const runRepomod = async (
	repomod: Repomod<Dependencies>,
	filePath: string,
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
		filePath,
		{},
	);

	return externalFileCommands.map((externalFileCommand): ModCommand => {
		if (externalFileCommand.kind === 'upsertFile') {
			return {
				kind: 'updateFile',
				oldPath: externalFileCommand.path,
				newData: externalFileCommand.data,
			};
		}

		return {
			kind: 'deleteFile',
			oldPath: externalFileCommand.path,
		};
	});
};
