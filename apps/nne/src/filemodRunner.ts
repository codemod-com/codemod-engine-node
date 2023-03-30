import {
	buildDeclarativeFilemod,
	buildDeclarativeTransform,
	buildFilePathTransformApi,
} from '@intuita-inc/filemod-engine';
import { ModCommand } from './modCommands.js';

export type Filemod = Readonly<{
	engine: 'filemod-engine';
	caseTitle: string;
	group: string | null;
	transformer: string;
}>;

export const runFilemod = async (
	filemod: Filemod,
	filePath: string,
): Promise<ModCommand[]> => {
	const modCommands: ModCommand[] = [];

	const buffer = Buffer.from(filemod.transformer, 'base64url');

	// TODO verify if this works?
	const rootDirectoryPath = '/';

	const transformApi = buildFilePathTransformApi(rootDirectoryPath, filePath);

	const declarativeFilemod = await buildDeclarativeFilemod({
		buffer,
	});

	const declarativeTransform = buildDeclarativeTransform(declarativeFilemod);

	const filemodCommands = await declarativeTransform(
		rootDirectoryPath,
		transformApi,
	);

	for (const command of filemodCommands) {
		if (command.kind === 'delete') {
			modCommands.push({
				kind: 'deleteFile',
				oldPath: command.path,
			});
		}

		if (command.kind === 'move') {
			modCommands.push({
				kind: 'moveFile',
				oldPath: command.fromPath,
				newPath: command.toPath,
			});
		}

		if (command.kind === 'copy') {
			modCommands.push({
				kind: 'copyFile',
				oldPath: command.fromPath,
				newPath: command.toPath,
			});
		}
	}

	return modCommands;
};
