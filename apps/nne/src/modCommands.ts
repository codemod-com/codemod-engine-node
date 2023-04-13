import { format, resolveConfig, Options } from 'prettier';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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

const DEFAULT_PRETTIER_OPTIONS: Options = {
	tabWidth: 4,
	useTabs: true,
	semi: true,
	singleQuote: true,
	quoteProps: 'as-needed',
	trailingComma: 'all',
	bracketSpacing: true,
	arrowParens: 'always',
	endOfLine: 'lf',
	parser: 'typescript',
};

const getConfig = async (path: string): Promise<Options> => {
	try {
		const config = await resolveConfig(path);

		if (config === null || Object.keys(config).length === 0) {
			return DEFAULT_PRETTIER_OPTIONS;
		}

		return config;
	} catch (error) {
		console.error(error);

		return DEFAULT_PRETTIER_OPTIONS;
	}
};

const formatText = async (path: string, data: string): Promise<string> => {
	try {
		const options = await getConfig(path);

		return format(data, options);
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

	const oldDataPath = join(outputDirectoryPath, `${oldHashDigest}.txt`);
	const newDataPath = join(outputDirectoryPath, `${newHashDigest}.txt`);

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
		const newData = await formatText(command.newPath, command.newData);

		return {
			...command,
			newData,
			formatted: true,
		};
	}

	if (command.kind === 'updateFile') {
		const oldData = await formatText(command.oldPath, command.oldData);
		const newData = await formatText(command.oldPath, command.newData);

		if (oldData === newData) {
			return null;
		}

		return {
			...command,
			newData,
			oldData,
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
