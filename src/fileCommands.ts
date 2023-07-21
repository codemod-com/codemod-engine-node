import { createHash } from 'node:crypto';
import { join, extname, dirname } from 'node:path';
import { format, resolveConfig, Options } from 'prettier';
import { IFs } from 'memfs';
import { filterNeitherNullNorUndefined } from './filterNeitherNullNorUndefined.js';
import { RunSettings } from './executeMainThread.js';
import { Printer } from './printer.js';

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

export type FileCommand =
	| CreateFileCommand
	| UpdateFileCommand
	| DeleteFileCommand
	| MoveFileCommand
	| CopyFileCommand;

export type FormattedFileCommand = FileCommand & { formatted: true };

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

const buildFormattedFileCommand = async (
	command: FileCommand,
): Promise<FormattedFileCommand | null> => {
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

export const buildFormattedFileCommands = async (
	commands: readonly FileCommand[],
): Promise<readonly FormattedFileCommand[]> => {
	const formattedFileCommands = await Promise.all(
		commands.map((command) => buildFormattedFileCommand(command)),
	);

	return formattedFileCommands.filter(filterNeitherNullNorUndefined);
};

export const handleFormattedFileCommand = async (
	fileSystem: IFs,
	printer: Printer,
	runSettings: RunSettings,
	command: FormattedFileCommand,
	memoryFileSystemUsed: boolean,
): Promise<void> => {
	if (command.kind === 'createFile') {
		if (!runSettings.dryRun) {
			const directoryPath = dirname(command.newPath);

			await fileSystem.promises.mkdir(directoryPath, { recursive: true });

			await fileSystem.promises.writeFile(
				command.newPath,
				command.newData,
			);

			return;
		}

		const hash = createHash('md5')
			.update(command.kind)
			.update(command.newPath)
			.update(command.newData)
			.digest('base64url');

		const extName = extname(command.newPath);
		const newDataPath = join(
			runSettings.outputDirectoryPath,
			`${hash}${extName}`,
		);

		await fileSystem.promises.writeFile(newDataPath, command.newData);

		if (!memoryFileSystemUsed) {
			printer.log({
				kind: 'create',
				newFilePath: command.newPath,
				newContentPath: newDataPath,
			});
		}

		return;
	}

	if (command.kind === 'deleteFile') {
		if (!runSettings.dryRun) {
			await fileSystem.promises.unlink(command.oldPath);

			return;
		}

		if (!memoryFileSystemUsed) {
			printer.log({
				kind: 'delete',
				oldFilePath: command.oldPath,
			});
		}

		return;
	}

	if (command.kind === 'moveFile') {
		if (!runSettings.dryRun) {
			await fileSystem.promises.copyFile(
				command.oldPath,
				command.newPath,
			);

			await fileSystem.promises.unlink(command.oldPath);

			return;
		}

		if (!memoryFileSystemUsed) {
			printer.log({
				kind: 'move',
				oldFilePath: command.oldPath,
				newFilePath: command.newPath,
			});
		}

		return;
	}

	if (command.kind === 'updateFile') {
		if (!runSettings.dryRun) {
			await fileSystem.promises.writeFile(
				command.oldPath,
				command.newData,
			);

			return;
		}

		const hashDigest = createHash('md5')
			.update(command.kind)
			.update(command.oldPath)
			.update(command.newData)
			.digest('base64url');

		const extName = extname(command.oldPath);

		const newDataPath = join(
			runSettings.outputDirectoryPath,
			`${hashDigest}${extName}`,
		);

		await fileSystem.promises.writeFile(newDataPath, command.newData);

		if (!memoryFileSystemUsed) {
			printer.log({
				kind: 'rewrite',
				oldPath: command.oldPath,
				newDataPath,
			});
		}

		return;
	}

	if (command.kind === 'copyFile') {
		if (!runSettings.dryRun) {
			const directoryPath = dirname(command.newPath);

			await fileSystem.promises.mkdir(directoryPath, { recursive: true });

			await fileSystem.promises.copyFile(
				command.oldPath,
				command.newPath,
			);

			return;
		}

		if (!memoryFileSystemUsed) {
			printer.log({
				kind: 'copy',
				oldFilePath: command.oldPath,
				newFilePath: command.newPath,
			});
		}

		return;
	}

	throw new Error('Unrecognized command kind');
};
