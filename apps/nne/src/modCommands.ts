import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CreateMessage, MessageKind, RewriteMessage } from './messages';

export type CreateFileCommand = Readonly<{
	kind: 'createFile';
	newPath: string;
	newData: string;
}>;

export type UpdateFileCommand = Readonly<{
	kind: 'updateFile';
	oldPath: string;
	newData: string;
}>;

export type ModCommand = CreateFileCommand | UpdateFileCommand;

export const handleCreateFileCommand = async (
	outputDirectoryPath: string,
	modId: string,
	command: CreateFileCommand,
): Promise<CreateMessage> => {
	const hash = createHash('md5')
		.update(command.kind)
		.update(command.newPath)
		.update(command.newData)
		.digest('base64url');

	const newDataPath = join(outputDirectoryPath, `${hash}.txt`);

	await writeFile(newDataPath, command.newData);

	return {
		k: MessageKind.create,
		newFilePath: command.newPath,
		newContentPath: newDataPath,
		modId,
	};
};

export const handleUpdateFileCommand = async (
	outputDirectoryPath: string,
	modId: string,
	command: UpdateFileCommand,
): Promise<RewriteMessage> => {
	const hash = createHash('md5')
		.update(command.kind)
		.update(command.oldPath)
		.update(command.newData)
		.digest('base64url');

	const newDataPath = join(outputDirectoryPath, `${hash}.txt`);

	await writeFile(newDataPath, command.newData);

	return {
		k: MessageKind.rewrite,
		i: command.oldPath,
		o: newDataPath,
		c: modId,
	};
};
