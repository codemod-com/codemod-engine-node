import {
	FileCommand,
	FormattedFileCommand,
	buildFormattedFileCommands,
	modifyFileSystemUponCommand,
} from './fileCommands.js';
import { Dependencies, runRepomod } from './runRepomod.js';
import { escape, glob } from 'glob';
import type { FlowSettings, RunSettings } from './executeMainThread.js';
import * as fs from 'fs';
import { dirname } from 'node:path';
import { Repomod } from '@intuita-inc/repomod-engine-api';
import { Printer } from './printer.js';
import { Codemod } from './codemod.js';
import { IFs, Volume, createFsFromVolume } from 'memfs';
import { createHash } from 'node:crypto';
import { WorkerThreadManager } from './workerThreadManager.js';
import { getTransformer } from './getTransformer.js';
import { Message } from './messages.js';

const buildPaths = async (
	fileSystem: IFs,
	flowSettings: FlowSettings,
	codemod: Codemod,
	repomod: Repomod<Dependencies> | null,
): Promise<ReadonlyArray<string>> => {
	if (codemod.engine === 'repomod-engine' && repomod !== null) {
		const repomodPaths = await glob(
			repomod.includePatterns?.slice() ?? [],
			{
				absolute: true,
				cwd: flowSettings.inputDirectoryPath,
				// @ts-expect-error type inconsistency
				fs: fileSystem,
				ignore: repomod.excludePatterns?.slice(),
				nodir: true,
			},
		);

		const flowPaths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			// @ts-expect-error type inconsistency
			fs: fileSystem,
			ignore: flowSettings.excludePattern.slice(),
			nodir: true,
		});

		return repomodPaths
			.filter((path) => flowPaths.includes(path))
			.map((path) => escape(path))
			.slice(0, flowSettings.fileLimit);
	} else {
		const paths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			// @ts-expect-error type inconsistency
			fs: fileSystem,
			ignore: flowSettings.excludePattern.slice(),
			nodir: true,
		});

		return paths.slice(0, flowSettings.fileLimit);
	}
};

export const runCodemod = async (
	fileSystem: IFs,
	printer: Printer,
	codemod: Codemod,
	flowSettings: FlowSettings,
	runSettings: RunSettings,
	onCommand: (command: FormattedFileCommand) => Promise<void>,
	onPrinterMessage: (message: Message) => void,
): Promise<void> => {
	const name = 'name' in codemod ? codemod.name : codemod.indexPath;

	printer.info('Running the "%s" codemod using "%s"', name, codemod.engine);

	if (codemod.engine === 'piranha') {
		throw new Error('Piranha not supported');
	}

	if (codemod.engine === 'recipe') {
		if (!runSettings.dryRun) {
			for (const subCodemod of codemod.codemods) {
				const commands: FormattedFileCommand[] = [];

				await runCodemod(
					fileSystem,
					printer,
					subCodemod,
					flowSettings,
					runSettings,
					async (command) => {
						commands.push(command);
					},
					() => {
						// we are discarding any printer messages from subcodemods
						// if we are within a recipe
					},
				);

				for (const command of commands) {
					await modifyFileSystemUponCommand(
						fileSystem,
						runSettings,
						command,
					);
				}
			}

			return;
		}

		// establish a in-memory file system
		const volume = Volume.fromJSON({});
		const mfs = createFsFromVolume(volume);

		const paths = await buildPaths(fileSystem, flowSettings, codemod, null);

		const fileMap = new Map<string, string>();

		for (const path of paths) {
			const data = await fs.promises.readFile(path, { encoding: 'utf8' });

			await mfs.promises.mkdir(dirname(path), { recursive: true });
			await mfs.promises.writeFile(path, data);

			const dataHashDigest = createHash('ripemd160')
				.update(data)
				.digest('base64url');

			fileMap.set(path, dataHashDigest);
		}

		for (const subCodemod of codemod.codemods) {
			const commands: FormattedFileCommand[] = [];

			await runCodemod(
				mfs,
				printer,
				subCodemod,
				flowSettings,
				{
					dryRun: false,
				},
				async (command) => {
					commands.push(command);
				},
				() => {
					// we are discarding any printer messages from subcodemods
					// if we are within a recipe
				},
			);

			for (const command of commands) {
				await modifyFileSystemUponCommand(
					mfs,
					{ dryRun: false },
					command,
				);
			}
		}

		const newPaths = await glob(['**/*.*'], {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			// @ts-expect-error type inconsistency
			fs: mfs,
			nodir: true,
		});

		const fileCommands: FileCommand[] = [];

		for (const newPath of newPaths) {
			const newDataBuffer = await mfs.promises.readFile(newPath);
			const newData = newDataBuffer.toString();

			const oldDataFileHash = fileMap.get(newPath) ?? null;

			if (oldDataFileHash === null) {
				// the file has been created
				fileCommands.push({
					kind: 'createFile',
					newPath,
					newData,
					formatWithPrettier: false,
				});
			} else {
				const newDataFileHash = createHash('ripemd160')
					.update(newData)
					.digest('base64url');

				if (newDataFileHash !== oldDataFileHash) {
					fileCommands.push({
						kind: 'updateFile',
						oldPath: newPath,
						newData,
						oldData: '', // TODO no longer necessary
						formatWithPrettier: false,
					});
				}

				// no changes to the file
			}

			fileMap.delete(newPath);
		}

		for (const oldPath of fileMap.keys()) {
			fileCommands.push({
				kind: 'deleteFile',
				oldPath,
			});
		}

		const commands = await buildFormattedFileCommands(fileCommands);

		for (const command of commands) {
			await onCommand(command);
		}

		return;
	}

	const source = fs.readFileSync(codemod.indexPath, {
		encoding: 'utf8',
	});

	const transformer = getTransformer(source);

	if (transformer === null) {
		throw new Error(
			`The transformer cannot be null: ${codemod.indexPath} ${codemod.engine}`,
		);
	}

	if (codemod.engine === 'repomod-engine') {
		const paths = await buildPaths(
			fileSystem,
			flowSettings,
			codemod,
			transformer as Repomod<Dependencies>,
		);

		const fileCommands = await runRepomod(
			fileSystem,
			{ ...transformer, includePatterns: paths, excludePatterns: [] },
			flowSettings.inputDirectoryPath,
			flowSettings.usePrettier,
		);

		const commands = await buildFormattedFileCommands(fileCommands);

		for (const command of commands) {
			await onCommand(command);
		}

		return;
	}

	// jscodeshift or ts-morph
	const paths = await buildPaths(fileSystem, flowSettings, codemod, null);

	const { engine } = codemod;

	await new Promise<void>((resolve) => {
		new WorkerThreadManager(
			flowSettings.threadCount,
			engine,
			source,
			flowSettings.usePrettier,
			paths.slice(),
			(message) => {
				if (message.kind === 'finish') {
					resolve();
				}

				onPrinterMessage(message);
			},
			onCommand,
		);
	});
};
