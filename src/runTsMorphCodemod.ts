import vm from 'node:vm';
import tsmorph from 'ts-morph';
import type { FileCommand } from './fileCommands.js';

const transform = (
	codemodSource: string,
	oldPath: string,
	oldData: string,
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

		handleSourceFile(sourceFile);
	`;

	const context = vm.createContext({
		exports: {},
		__INTUITA__oldPath: oldPath,
		__INTUITA__oldData: oldData,
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
): readonly FileCommand[] => {
	const newData = transform(codemodSource, oldPath, oldData);

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
