/* eslint-disable @typescript-eslint/no-empty-function */
import jscodeshift, { API, FileInfo, Transform } from 'jscodeshift';
import type { FileCommand } from './fileCommands.js';

const buildApi = (parser: string): API => ({
	j: jscodeshift.withParser(parser),
	jscodeshift: jscodeshift.withParser(parser),
	stats: () => {},
	report: () => {},
});

export const runJscodeshiftCodemod = (
	transform: Transform,
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

	const fileInfo: FileInfo = {
		path: oldPath,
		source: oldData,
	};

	const newData = transform(fileInfo, buildApi('tsx'), {
		createFile,
	});

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
