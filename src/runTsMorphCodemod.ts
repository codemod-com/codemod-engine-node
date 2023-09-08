import vm from 'node:vm';
import tsmorph from 'ts-morph';
import { ArgumentRecord } from './argumentRecord.js';
import type { FileCommand } from './fileCommands.js';

const transform = (
	codemodSource: string,
	oldPath: string,
	oldData: string,
	argumentRecord: ArgumentRecord,
): string => {
	const codeToExecute = `
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
		__INTUITA__argumentRecord: { ...argumentRecord },
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
	argumentRecord: ArgumentRecord,
): readonly FileCommand[] => {
	const newData = transform(codemodSource, oldPath, oldData, argumentRecord);

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
