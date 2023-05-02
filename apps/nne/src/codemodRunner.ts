/* eslint-disable @typescript-eslint/no-empty-function */
import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { buildTsMorphProject } from './buildTsMorphProject.js';
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
			engine: 'ts-morph';
			caseTitle: string;
			group: string | null;
			// eslint-disable-next-line @typescript-eslint/ban-types
			transformer: Function;
	  }>;

const buildApi = (parser: string): API => ({
	j: jscodeshift.withParser(parser),
	jscodeshift: jscodeshift.withParser(parser),
	stats: () => {},
	report: () => {},
});

export const runJscodeshiftCodemod = (
	codemod: Codemod & { engine: 'jscodeshift' },
	oldPath: string,
	oldData: string,
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
		source: oldData,
	};

	const newData = codemod.transformer(
		fileInfo,
		buildApi(codemod.withParser),
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
	});

	return commands;
};

export const runTsMorphCodemod = (
	codemod: Codemod & { engine: 'ts-morph' },
	oldPath: string,
	oldData: string,
): readonly ModCommand[] => {
	const project = buildTsMorphProject();
	const sourceFile = project.createSourceFile(oldPath, oldData);
	const newData = codemod.transformer(sourceFile);

	if (typeof newData !== 'string' || oldData === newData) {
		return [];
	}

	return [
		{
			kind: 'updateFile',
			oldPath,
			oldData,
			newData,
		},
	];
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
