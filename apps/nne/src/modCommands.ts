import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import {
	CopyMessage,
	CreateMessage,
	DeleteMessage,
	Message,
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

export type FormattedInternalCommand = ModCommand & { formatted: true };

export const formatText = (data: string) => data.replace(/\/\*\* \*\*\//gm, '');

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

	const extName = extname(command.newPath);
	const newDataPath = join(outputDirectoryPath, `${hash}${extName}`);

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
	const oldHashDigest = createHash('md5')
		.update(command.kind)
		.update(command.oldPath)
		.update(command.oldData)
		.digest('base64url');

	const newHashDigest = createHash('md5')
		.update(command.kind)
		.update(command.oldPath)
		.update(command.newData)
		.digest('base64url');

	const extName = extname(command.oldPath);

	const oldDataPath = join(outputDirectoryPath, `${oldHashDigest}${extName}`);
	const newDataPath = join(outputDirectoryPath, `${newHashDigest}${extName}`);

	await writeFile(oldDataPath, command.oldData);
	await writeFile(newDataPath, command.newData);

	return {
		k: MessageKind.rewrite,
		i: command.oldPath,
		oldDataPath,
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

export const buildFormattedInternalCommand = async (
	command: ModCommand,
): Promise<FormattedInternalCommand | null> => {
	if (command.kind === 'createFile') {
		const newData = formatText(command.newData);

		return {
			...command,
			newData,
			formatted: true,
		};
	}

	if (command.kind === 'updateFile') {
		const newData = formatText(command.newData);

		if (command.oldData === newData) {
			return null;
		}

		return {
			...command,
			newData,
			formatted: true,
		};
	}

	return {
		...command,
		formatted: true,
	};
};

export const buildFormattedInternalCommands = async (
	commands: readonly ModCommand[],
): Promise<readonly FormattedInternalCommand[]> => {
	const formattedInternalCommands: FormattedInternalCommand[] = [];

	for (const command of commands) {
		const formattedInternalCommand = await buildFormattedInternalCommand(
			command,
		);

		if (formattedInternalCommand === null) {
			continue;
		}

		formattedInternalCommands.push(formattedInternalCommand);
	}

	return formattedInternalCommands;
};

export const handleFormattedInternalCommand = async (
	outputDirectoryPath: string,
	modId: string,
	command: FormattedInternalCommand,
): Promise<Message> => {
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
