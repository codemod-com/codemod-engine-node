import { Project } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import type { FileCommand } from './fileCommands.js';

export const runTsMorphCodemod = (
	transform: (sourceFile: SourceFile) => string | null | undefined,
	oldPath: string,
	oldData: string,
	formatWithPrettier: boolean,
): readonly FileCommand[] => {
	const project = new Project({
		useInMemoryFileSystem: true,
		skipFileDependencyResolution: true,
		compilerOptions: {
			allowJs: true,
		},
	});

	const sourceFile = project.createSourceFile(oldPath, oldData);
	const newData = transform(sourceFile);

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
