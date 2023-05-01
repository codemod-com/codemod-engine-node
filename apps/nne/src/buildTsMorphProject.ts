import { Project } from 'ts-morph';

export const buildTsMorphProject = (): Project => {
	return new Project({
		useInMemoryFileSystem: true,
		skipFileDependencyResolution: true,
		compilerOptions: {
			allowJs: true,
		},
	});
};
