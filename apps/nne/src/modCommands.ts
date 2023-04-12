import { format, resolveConfig } from 'prettier';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
	CopyMessage,
	CreateMessage,
	DeleteMessage,
	MessageKind,
	MoveMessage,
	RewriteMessage,
} from './messages.js';

export type CreateFileCommand = Readonly<{
	kind: 'createFile';
	newPath: string;
	newData: string;
}>;

export type UpdateFileCommand = Readonly<{
	kind: 'updateFile';
	oldPath: string;
	oldData: string;
	newData: string;
}>;

export type DeleteFileCommand = Readonly<{
	kind: 'deleteFile';
	oldPath: string;
}>;

export type MoveFileCommand = Readonly<{
	kind: 'moveFile';
	oldPath: string;
	newPath: string;
}>;

export type CopyFileCommand = Readonly<{
	kind: 'copyFile';
	oldPath: string;
	newPath: string;
}>;

export type ModCommand =
	| CreateFileCommand
	| UpdateFileCommand
	| DeleteFileCommand
	| MoveFileCommand
	| CopyFileCommand;

const formatText = async (path: string, data: string): Promise<string> => {
	try {
		const options = await resolveConfig(path);

		return format(data, options ?? undefined);
	} catch (err) {
		return data;
	}
};

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

	const data = await formatText(newDataPath, command.newData);

	await writeFile(newDataPath, data);

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

	const data = await formatText(newDataPath, command.newData);

	await writeFile(newDataPath, data);

	return {
		k: MessageKind.rewrite,
		i: command.oldPath,
		o: newDataPath,
		c: modId,
	};
};

export const handleDeleteFileCommmand = async (
	_: string,
	modId: string,
	command: DeleteFileCommand,
): Promise<DeleteMessage> => {
	return {
		k: MessageKind.delete,
		oldFilePath: command.oldPath,
		modId,
	};
};

export const handleMoveFileCommand = async (
	_: string,
	modId: string,
	command: MoveFileCommand,
): Promise<MoveMessage> => {
	return {
		k: MessageKind.move,
		oldFilePath: command.oldPath,
		newFilePath: command.newPath,
		modId,
	};
};

export const handleCopyFileCommand = async (
	_: string,
	modId: string,
	command: CopyFileCommand,
): Promise<CopyMessage> => {
	return {
		k: MessageKind.copy,
		oldFilePath: command.oldPath,
		newFilePath: command.newPath,
		modId,
	};
};

export const handleCommand = async (
	outputDirectoryPath: string,
	modId: string,
	command: ModCommand,
) => {
	switch (command.kind) {
		case 'createFile':
			return await handleCreateFileCommand(
				outputDirectoryPath,
				modId,
				command,
			);
		case 'deleteFile':
			return await handleDeleteFileCommmand(
				outputDirectoryPath,
				modId,
				command,
			);
		case 'moveFile':
			return await handleMoveFileCommand(
				outputDirectoryPath,
				modId,
				command,
			);
		case 'updateFile':
			return await handleUpdateFileCommand(
				outputDirectoryPath,
				modId,
				command,
			);
		case 'copyFile':
			return await handleCopyFileCommand(
				outputDirectoryPath,
				modId,
				command,
			);
	}
};
