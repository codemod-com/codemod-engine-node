import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { EmitHint, Project } from 'ts-morph';
import { ModCommand } from './modCommands.js';

export type Codemod =
	| Readonly<{
			engine: 'jscodeshift';
			caseTitle: string;
			group: string | null;
			// eslint-disable-next-line @typescript-eslint/ban-types
			transformer: Function;
			withParser: string;
	  }>
	| Readonly<{
			engine: 'tsmorph';
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

export const runJscodeshiftCodemod = (
	codemod: Codemod & { engine: 'jscodeshift' },
	oldPath: string,
	oldSource: string,
): readonly ModCommand[] => {
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
			oldData: oldSource,
			newData: newSource,
		});
	}

	return commands;
};

export const runTsMorphCodemod = (
	codemod: Codemod & { engine: 'tsmorph' },
	oldPath: string,
	oldData: string,
): readonly ModCommand[] => {
	// reprint the original (old) data
	const oldProject = new Project({});
	const oldSourceFile = oldProject.createSourceFile('index.tsx', oldData);
	const oldSource = oldSourceFile.print({ emitHint: EmitHint.SourceFile });

	const newProject = new Project({});
	// the newSourceFile is created from the oldSource
	const newSourceFile = newProject.createSourceFile('index.tsx', oldSource);
	const newSource = codemod.transformer(newSourceFile);

	if (typeof newSource === 'string' && oldSource !== newSource) {
		return [
			{
				kind: 'updateFile',
				oldPath: oldPath,
				oldData: oldSource,
				newData: newSource,
			},
		];
	}

	return [];
};

export const runCodemod = (
	codemod: Codemod,
	oldPath: string,
	oldData: string,
): readonly ModCommand[] => {
	if (codemod.engine === 'jscodeshift') {
		return runJscodeshiftCodemod(codemod, oldPath, oldData);
	}

	return runTsMorphCodemod(codemod, oldPath, oldData);
};
