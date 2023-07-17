import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { format, resolveConfig, Options } from 'prettier';
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
	formatWithPrettier: boolean;
}>;

export type UpdateFileCommand = Readonly<{
	kind: 'updateFile';
	oldPath: string;
	oldData: string;
	newData: string;
	formatWithPrettier: boolean;
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

export const DEFAULT_PRETTIER_OPTIONS: Options = {
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

export const getConfig = async (path: string): Promise<Options> => {
	const config = await resolveConfig(path, {
		editorconfig: false,
	});

	if (config === null || Object.keys(config).length === 0) {
		throw new Error('Unable to resolve config');
	}

	const parser = path.endsWith('.css')
		? 'css'
		: config.parser ?? DEFAULT_PRETTIER_OPTIONS.parser;

	return {
		...config,
		parser,
	};
};

export const formatText = async (
	path: string,
	oldData: string,
	formatWithPrettier: boolean,
): Promise<string> => {
	const newData = oldData.replace(/\/\*\* \*\*\//gm, '');

	if (!formatWithPrettier) {
		return newData;
	}

	try {
		const options = await getConfig(path);
		return format(newData, options);
	} catch (err) {
		return newData;
	}
};

export const handleCreateFileCommand = async (
	outputDirectoryPath: string,
	command: CreateFileCommand,
	executionId: string,
): Promise<CreateMessage> => {
	const hash = createHash('md5')
		.update(command.kind)
		.update(command.newPath)
		.update(command.newData)
		.digest('base64url');

	const extName = extname(command.newPath);
	const newDataPath = join(
		outputDirectoryPath,
		`${executionId}${hash}${extName}`,
	);
	await writeFile(newDataPath, command.newData);

	return {
		k: MessageKind.create,
		newFilePath: command.newPath,
		newContentPath: newDataPath,
	};
};

export const handleUpdateFileCommand = async (
	outputDirectoryPath: string,
	command: UpdateFileCommand,
	executionId: string,
): Promise<RewriteMessage> => {
	const newHashDigest = createHash('md5')
		.update(command.kind)
		.update(command.oldPath)
		.update(command.newData)
		.digest('base64url');

	const extName = extname(command.oldPath);

	const newDataPath = join(
		outputDirectoryPath,
		`${executionId}${newHashDigest}${extName}`,
	);

	await writeFile(newDataPath, command.newData);

	return {
		k: MessageKind.rewrite,
		i: command.oldPath,
		o: newDataPath,
	};
};

export const buildFormattedInternalCommand = async (
	command: ModCommand,
): Promise<FormattedInternalCommand | null> => {
	if (command.kind === 'createFile') {
		const newData = await formatText(
			command.newPath,
			command.newData,
			command.formatWithPrettier,
		);

		return {
			...command,
			newData,
			formatted: true,
		};
	}

	if (command.kind === 'updateFile') {
		const newData = await formatText(
			command.oldPath,
			command.newData,
			command.formatWithPrettier,
		);

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
	command: FormattedInternalCommand,
	executionId: string,
): Promise<Message> => {
	if (command.kind === 'createFile') {
		return await handleCreateFileCommand(
			outputDirectoryPath,
			command,
			executionId,
		);
	}

	if (command.kind === 'deleteFile') {
		return {
			k: MessageKind.delete,
			oldFilePath: command.oldPath,
		};
	}

	if (command.kind === 'moveFile') {
		return {
			k: MessageKind.move,
			oldFilePath: command.oldPath,
			newFilePath: command.newPath,
		};
	}

	if (command.kind === 'updateFile') {
		return await handleUpdateFileCommand(
			outputDirectoryPath,
			command,
			executionId,
		);
	}

	if (command.kind === 'copyFile') {
		return {
			k: MessageKind.copy,
			oldFilePath: command.oldPath,
			newFilePath: command.newPath,
		};
	}

	throw new Error('Unrecognized command kind');
};
