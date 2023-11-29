import { IFs } from 'memfs';
import path from 'node:path';
import { Codemod, isJavaScriptCodemodEngineSchema } from './codemod.js';
import { CodemodSettings } from './schemata/codemodSettingsSchema.js';

async function readJsonField(
	fs: IFs,
	filePath: string,
	field: string,
): Promise<string | null> {
	const json = await fs.promises.readFile(filePath, { encoding: 'utf-8' });

	const parsedJson = JSON.parse(json.toString());
	if (!parsedJson[field]) {
		return null;
	}

	return parsedJson[field];
}

export const buildSourcedCodemodOptions = async (
	fs: IFs,
	codemodOptions: CodemodSettings & { kind: 'runSourced' },
): Promise<Codemod & { source: 'fileSystem' }> => {
	const isDirectorySource = await fs.promises
		.lstat(codemodOptions.sourcePath)
		.then((pathStat) => pathStat.isDirectory());

	if (!isDirectorySource) {
		if (codemodOptions.codemodEngine === null) {
			throw new Error(
				'--codemodEngine has to be defined when running local codemod',
			);
		}

		return {
			source: 'fileSystem' as const,
			engine: codemodOptions.codemodEngine,
			indexPath: codemodOptions.sourcePath,
		};
	}

	if (
		!['config.json', 'package.json']
			.map((lookedupFilePath) =>
				path.join(codemodOptions.sourcePath, lookedupFilePath),
			)
			.every(fs.existsSync)
	) {
		throw new Error(
			`Codemod directory is of incorrect structure at ${codemodOptions.sourcePath}`,
		);
	}

	const mainScriptRelativePath = await readJsonField(
		fs,
		path.join(codemodOptions.sourcePath, 'package.json'),
		'main',
	);
	if (!mainScriptRelativePath) {
		throw new Error(
			`No main script specified for codemod at ${codemodOptions.sourcePath}`,
		);
	}

	const mainScriptPath = path.join(
		codemodOptions.sourcePath,
		mainScriptRelativePath,
	);

	const engine = await readJsonField(
		fs,
		path.join(codemodOptions.sourcePath, 'config.json'),
		'engine',
	);
	if (!engine) {
		throw new Error(
			`No engine file specified for codemod at ${codemodOptions.sourcePath}`,
		);
	}
	if (!isJavaScriptCodemodEngineSchema(engine)) {
		throw new Error(
			`Engine specified in config.json at ${codemodOptions.sourcePath} could not be recognized.`,
		);
	}

	return {
		source: 'fileSystem' as const,
		engine,
		indexPath: mainScriptPath,
	};
};
