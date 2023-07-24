import { runJscodeshiftCodemod } from './runJscodeshiftCodemod.js';
import {
	FileCommand,
	buildFormattedFileCommands,
	buildPrinterMessageUponCommand,
	modifyFileSystemUponCommand,
} from './fileCommands.js';
import { Dependencies, runRepomod } from './runRepomod.js';
import { escape, glob } from 'glob';
import type { FlowSettings, RunSettings } from './executeMainThread.js';
import * as fs from 'fs';
import * as tsmorph from 'ts-morph';
import nodePath, { dirname } from 'node:path';
import { Repomod } from '@intuita-inc/repomod-engine-api';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';
import { Printer } from './printer.js';
import { Codemod } from './codemod.js';
import { IFs, Volume, createFsFromVolume } from 'memfs';
import { createHash } from 'node:crypto';

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
			},
		);

		const flowPaths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			// @ts-expect-error type inconsistency
			fs: fileSystem,
			ignore: flowSettings.excludePattern.slice(),
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
	memoryFileSystemUsed: boolean,
) => {
	const name = 'name' in codemod ? codemod.name : codemod.indexPath;

	printer.info('Running the "%s" codemod using "%s"', name, codemod.engine);

	if (codemod.engine === 'piranha') {
		throw new Error('Piranha not supported');
	}

	if (codemod.engine === 'recipe') {
		if (!memoryFileSystemUsed) {
			for (const c of codemod.codemods) {
				await runCodemod(
					fileSystem,
					printer,
					c,
					flowSettings,
					runSettings,
					memoryFileSystemUsed,
				);
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

		for (const c of codemod.codemods) {
			await runCodemod(
				mfs,
				printer,
				c,
				flowSettings,
				{ dryRun: false },
				true,
			);
		}

		const newPaths = await glob(['**/*.*'], {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			// @ts-expect-error type inconsistency
			fs: mfs,
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

		const formattedFileCommands = await buildFormattedFileCommands(
			fileCommands,
		);

		for (const command of formattedFileCommands) {
			const lazyPromise = modifyFileSystemUponCommand(
				// @ts-expect-error type inconsistency
				fs,
				runSettings,
				command,
			);

			await lazyPromise();

			const printerMessage =
				runSettings.dryRun === true
					? buildPrinterMessageUponCommand(
							runSettings.outputDirectoryPath,
							command,
					  )
					: null;

			if (printerMessage) {
				printer.log(printerMessage);
			}
		}

		return;
	}

	const source = fs.readFileSync(codemod.indexPath, {
		encoding: 'utf8',
	});

	type Exports =
		| {
				__esModule?: true;
				default?: unknown;
				handleSourceFile?: unknown;
				repomod?: Repomod<Dependencies>;
		  }
		// eslint-disable-next-line @typescript-eslint/ban-types
		| Function;

	const module = { exports: {} as Exports };
	const req = (name: string) => {
		if (name === 'ts-morph') {
			return tsmorph;
		}

		if (name === 'node:path') {
			return nodePath;
		}
	};

	const keys = ['module', 'require'];
	const values = [module, req];

	// eslint-disable-next-line prefer-spread
	new Function(...keys, source).apply(null, values);

	const transformer =
		typeof module.exports === 'function'
			? module.exports
			: module.exports.__esModule &&
			  typeof module.exports.default === 'function'
			? module.exports.default
			: typeof module.exports.handleSourceFile === 'function'
			? module.exports.handleSourceFile
			: module.exports.repomod !== undefined
			? module.exports.repomod
			: null;

	if (transformer === null) {
		throw new Error(
			`The transformer cannot be null: ${codemod.indexPath} ${codemod.engine}`,
		);
	}

	if (codemod.engine === 'repomod-engine') {
		const repomod =
			'repomod' in module.exports ? module.exports.repomod ?? null : null;

		if (repomod === null) {
			throw new Error(
				'Could not find the repomod object exported from the CommonJS module',
			);
		}

		const paths = await buildPaths(
			fileSystem,
			flowSettings,
			codemod,
			repomod,
		);

		const fileCommands = await runRepomod(
			fileSystem,
			{ ...repomod, includePatterns: paths, excludePatterns: [] },
			flowSettings.inputDirectoryPath,
			flowSettings.usePrettier,
		);

		const formattedFileCommands = await buildFormattedFileCommands(
			fileCommands,
		);

		for (const command of formattedFileCommands) {
			const lazyPromise = modifyFileSystemUponCommand(
				fileSystem,
				runSettings,
				command,
			);

			await lazyPromise();

			const printerMessage =
				runSettings.dryRun === true
					? buildPrinterMessageUponCommand(
							runSettings.outputDirectoryPath,
							command,
					  )
					: null;

			if (!memoryFileSystemUsed && printerMessage) {
				printer.log(printerMessage);
			}
		}
	} else {
		const paths = await buildPaths(fileSystem, flowSettings, codemod, null);

		for (const path of paths) {
			printer.info('Running the "%s" codemod against "%s"', name, path);

			try {
				const data = await fileSystem.promises.readFile(path, 'utf8');

				const modCommands =
					codemod.engine === 'jscodeshift'
						? runJscodeshiftCodemod(
								// @ts-expect-error function type
								transformer,
								path,
								data,
								flowSettings.usePrettier,
						  )
						: runTsMorphCodemod(
								// @ts-expect-error function type
								transformer,
								path,
								data,
								flowSettings.usePrettier,
						  );

				const formattedFileCommands = await buildFormattedFileCommands(
					modCommands,
				);

				for (const command of formattedFileCommands) {
					const lazyPromise = modifyFileSystemUponCommand(
						fileSystem,
						runSettings,
						command,
					);

					await lazyPromise();

					const printerMessage =
						runSettings.dryRun === true
							? buildPrinterMessageUponCommand(
									runSettings.outputDirectoryPath,
									command,
							  )
							: null;

					if (!memoryFileSystemUsed && printerMessage) {
						printer.log(printerMessage);
					}
				}
			} catch (error) {
				if (!(error instanceof Error)) {
					return;
				}

				printer.error(error);
			}
		}
	}
};
