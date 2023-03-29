import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { ModCommand } from './modCommands.js';

export type Codemod = Readonly<{
	engine: 'jscodeshift';
	caseTitle: string;
	group: string | null;
	// eslint-disable-next-line @typescript-eslint/ban-types
	transformer: Function;
	withParser: string;
}>;

const buildApi = (parser: string): API => ({
	j: jscodeshift.withParser(parser),
	jscodeshift: jscodeshift.withParser(parser),
	stats: () => {
		console.error(
			'The stats function was called, which is not supported on purpose',
		);
	},
	report: () => {
		console.error(
			'The report function was called, which is not supported on purpose',
		);
	},
});

export const runCodemod = async (
	oldPath: string,
	oldSource: string,
	codemod: Codemod,
): Promise<ModCommand[]> => {
	const commands: ModCommand[] = [];

	const createFile = (newPath: string, newData: string): void => {
		commands.push({
			kind: 'createFile',
			newPath,
			newData,
		});
	};

	const fileInfo: FileInfo = {
		path: oldPath,
		source: oldSource,
	};

	const newSource = codemod.transformer(
		fileInfo,
		buildApi(codemod.withParser),
		{
			createFile,
		},
	);

	if (newSource && oldSource !== newSource) {
		commands.push({
			kind: 'updateFile',
			oldPath: oldPath,
			newData: newSource,
		});
	}

	return commands;
};
