import vm from 'node:vm';
import jscodeshift, { API, FileInfo } from 'jscodeshift';
import type { FileCommand } from './fileCommands.js';

export const buildApi = (parser: string): API => ({
	j: jscodeshift.withParser(parser),
	jscodeshift: jscodeshift.withParser(parser),
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	stats: () => {},
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	report: () => {},
});

const transform = (
	codemodSource: string,
	fileInfo: FileInfo,
	api: API,
	options: any,
): string => {
	const codeToExecute = `
		${codemodSource}

		transform(__INTUITA__file, __INTUITA__api, __INTUITA__options);
	`;

	// Create a new context for the code execution
	const exports = {};

	const context = vm.createContext({
		module: {
			exports,
		},
		exports,
		__INTUITA__file: fileInfo,
		__INTUITA__api: api,
		__INTUITA__options: options,
	});

	return vm.runInContext(codeToExecute, context);
};

export const runJscodeshiftCodemod = (
	codemodSource: string,
	oldPath: string,
	oldData: string,
	formatWithPrettier: boolean,
): readonly FileCommand[] => {
	const commands: FileCommand[] = [];

	const createFile = (newPath: string, newData: string): void => {
		commands.push({
			kind: 'createFile',
			newPath,
			newData,
			formatWithPrettier,
		});
	};

	const newData = transform(
		codemodSource,
		{
			path: oldPath,
			source: oldData,
		},
		buildApi('tsx'),
		{
			createFile,
		},
	);

	if (typeof newData !== 'string' || oldData === newData) {
		return commands;
	}

	commands.push({
		kind: 'updateFile',
		oldPath,
		oldData: oldData,
		newData,
		formatWithPrettier,
	});

	return commands;
};
