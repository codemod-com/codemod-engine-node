import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { Project } from 'ts-morph';
import { ModCommand } from './modCommands.js';

export type Codemod = Readonly<{
	engine: 'jscodeshift' | 'tsmorph';
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

	let newSource: string | undefined = undefined;

	if (codemod.engine === 'jscodeshift') {
		const fileInfo: FileInfo = {
			path: oldPath,
			source: oldSource,
		};

		newSource = codemod.transformer(
			fileInfo,
			buildApi(codemod.withParser),
			{
				createFile,
			},
		);
	} else {
		const project = new Project({});

		const sourceFile = project.createSourceFile('index.tsx', oldSource);

		newSource = codemod.transformer(sourceFile);
	}

	if (newSource && oldSource !== newSource) {
		commands.push({
			kind: 'updateFile',
			oldPath: oldPath,
			oldData: oldSource,
			newData: newSource,
		});
	}

	return commands;
};
