import { readFileSync, writeFileSync } from 'node:fs';
import { workerData } from 'node:worker_threads';
import { codemods as nneCodemods } from '@nne/codemods';
import { codemods as muiCodemods } from '@nne/mui-codemods';
import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { buildRewriteMessage } from './buildRewriteMessage';
import { buildChangeMessage } from './buildChangeMessages';
import {
	CreateMessage,
	DeleteMessage,
	Message,
	MessageKind,
	MoveMessage,
	ProgressMessage,
} from './messages';
import * as ts from 'typescript';
import { NewGroup } from './groups';
import {
	buildDeclarativeFilemod,
	buildDeclarativeTransform,
	buildFilePathTransformApi,
} from '@intuita-inc/filemod-engine';

export const executeWorkerThread = async () => {
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

	const {
		codemodFilePath,
		newGroups,
		filePath,
		outputDirectoryPath,
		totalFileCount,
		fileCount,
	} = workerData;

	newGroups satisfies ReadonlyArray<NewGroup>;

	const oldSource = readFileSync(filePath, { encoding: 'utf8' });

	type Codemod = Readonly<{
		engine: string;
		caseTitle: string;
		group: string | null;
		// eslint-disable-next-line @typescript-eslint/ban-types
		transformer?: Function | string;
		withParser?: string;
	}>;

	const codemods: Codemod[] = [];

	if (codemodFilePath) {
		try {
			if ((codemodFilePath as string).endsWith('.ts')) {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const requireFromString = require('require-from-string');

				const source = readFileSync(codemodFilePath, {
					encoding: 'utf8',
				});
				const compiledCode = ts.transpileModule(source, {
					compilerOptions: { module: ts.ModuleKind.CommonJS },
				});

				const mod = requireFromString(compiledCode.outputText);

				const transformer = 'default' in mod ? mod.default : mod;

				codemods.push({
					engine: 'jscodeshift',
					caseTitle: codemodFilePath,
					group: null,
					transformer,
					withParser: 'tsx',
				});
			} else {
				codemods.push({
					engine: 'jscodeshift',
					caseTitle: codemodFilePath,
					group: null,
					transformer: require(codemodFilePath),
					withParser: 'tsx',
				});
			}
		} catch (error) {
			console.error(error);
		}
	} else {
		codemods.push(...nneCodemods);
		codemods.push(...muiCodemods);
	}

	for (const codemod of codemods) {
		if (newGroups.length > 0 && !newGroups.includes(codemod.group)) {
			continue;
		}

		const fileInfo: FileInfo = {
			path: filePath,
			source: oldSource,
		};

		try {
			if (
				codemod.engine === 'jscodeshift' &&
				codemod.transformer &&
				typeof codemod.transformer === 'function' &&
				codemod.withParser
			) {
				const createFileCommands: CreateMessage[] = [];

				const createFile = (path: string, data: string) => {
					if (!outputDirectoryPath) {
						return;
					}

					const hash = createHash('md5')
						.update(filePath)
						.update(codemod.caseTitle)
						.update(path)
						.digest('base64url');

					const newContentPath = join(
						outputDirectoryPath,
						`${hash}.txt`,
					);

					writeFileSync(newContentPath, data);

					createFileCommands.push({
						k: MessageKind.create,
						newFilePath: path,
						newContentPath,
					});
				};

				const newSource = codemod.transformer(
					fileInfo,
					buildApi(codemod.withParser),
					{
						createFile,
					},
				);

				if (!newSource || oldSource === newSource) {
					continue;
				}

				if (outputDirectoryPath) {
					const hash = createHash('md5')
						.update(filePath)
						.update(codemod.caseTitle)
						.digest('base64url');

					const outputFilePath = join(
						outputDirectoryPath,
						`${hash}.txt`,
					);

					writeFileSync(outputFilePath, newSource);

					const rewrite = buildRewriteMessage(
						filePath,
						outputFilePath,
						codemod.caseTitle,
					);

					console.log(JSON.stringify(rewrite));
				} else {
					const change = buildChangeMessage(
						String(filePath),
						oldSource,
						newSource,
						codemod.caseTitle,
					);

					console.log(JSON.stringify(change));
				}

				for (const createFileCommand of createFileCommands) {
					console.log(JSON.stringify(createFileCommand));
				}
			}

			if (
				codemod.engine === 'filemod-engine' &&
				codemod.transformer &&
				typeof codemod.transformer === 'string'
			) {
				const buffer = Buffer.from(
					codemod.transformer ?? '',
					'base64url',
				);

				const rootDirectoryPath = '/';

				// TODO verify if this works?
				const transformApi = buildFilePathTransformApi(
					rootDirectoryPath,
					filePath,
				);

				const declarativeFilemod = await buildDeclarativeFilemod({
					buffer,
				});

				const declarativeTransform =
					buildDeclarativeTransform(declarativeFilemod);

				const commands = await declarativeTransform(
					rootDirectoryPath,
					transformApi,
				);

				for (const command of commands) {
					console.log(command);

					if (command.kind === 'delete') {
						const message: DeleteMessage = {
							k: MessageKind.delete,
							oldFilePath: command.path,
							modId: codemod.caseTitle,
						};

						console.log(JSON.stringify(message));
					}

					if (command.kind === 'move') {
						const message: MoveMessage = {
							k: MessageKind.move,
							oldFilePath: command.fromPath,
							newFilePath: command.toPath,
							modId: codemod.caseTitle,
						};

						console.log(JSON.stringify(message));
					}
				}
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error(
					JSON.stringify({
						message: error.message,
						caseTitle: codemod.caseTitle,
						group: codemod.group,
					}),
				);
			}
		}
	}

	const progressMessage: ProgressMessage = {
		k: MessageKind.progress,
		p: fileCount,
		t: totalFileCount,
	};

	console.log(JSON.stringify(progressMessage));
};
