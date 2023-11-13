import vm from 'node:vm';
import tsmorph from 'ts-morph';
import type { FileCommand } from './fileCommands.js';
import { SafeArgumentRecord } from './safeArgumentRecord.js';
import { ConsoleKind } from './schemata/consoleKindSchema.js';
import { CONSOLE_OVERRIDE } from './consoleOverride.js';
import { buildVmConsole } from './buildVmConsole.js';

const transform = (
	codemodSource: string,
	oldPath: string,
	oldData: string,
	safeArgumentRecord: SafeArgumentRecord,
	consoleCallback: (kind: ConsoleKind, message: string) => void,
): string => {
	const codeToExecute = `
		${CONSOLE_OVERRIDE}

		${codemodSource}

		const { Project } = require('ts-morph');

		const project = new Project({
			useInMemoryFileSystem: true,
			skipFileDependencyResolution: true,
			compilerOptions: {
				allowJs: true,
			},
		});
	
		const sourceFile = project.createSourceFile(__INTUITA__oldPath, __INTUITA__oldData);

		handleSourceFile(sourceFile, __INTUITA__argumentRecord);
	`;

	const exports = {};

	const context = vm.createContext({
		module: {
			exports,
		},
		exports,
		__INTUITA__oldPath: oldPath,
		__INTUITA__oldData: oldData,
		__INTUITA__argumentRecord: { ...safeArgumentRecord[0] },
		__INTUITA__console__: buildVmConsole(consoleCallback),
		require: (name: string) => {
			if (name === 'ts-morph') {
				return tsmorph;
			}
		},
	});

	return vm.runInContext(codeToExecute, context);
};

export const runTsMorphCodemod = (
	codemodSource: string,
	oldPath: string,
	oldData: string,
	formatWithPrettier: boolean,
	safeArgumentRecord: SafeArgumentRecord,
	consoleCallback: (kind: ConsoleKind, message: string) => void,
): readonly FileCommand[] => {
	const newData = transform(
		codemodSource,
		oldPath,
		oldData,
		safeArgumentRecord,
		consoleCallback,
	);

	if (typeof newData !== 'string' || oldData === newData) {
		return [];
	}

	return [
		{
			kind: 'updateFile',
			oldPath,
			oldData,
			newData,
			formatWithPrettier,
		},
	];
};
