import { runJscodeshiftCodemod } from './runJscodeshiftCodemod.js';
import {
	buildFormattedFileCommands,
	handleFormattedFileCommand,
} from './fileCommands.js';
import { Dependencies, runRepomod } from './runRepomod.js';
import { escape, glob } from 'glob';
import type { FlowSettings, RunSettings } from './executeMainThread.js';
import * as fs from 'fs';
import * as tsmorph from 'ts-morph';
import nodePath from 'node:path';
import { Repomod } from '@intuita-inc/repomod-engine-api';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';
import { Printer } from './printer.js';
import { Codemod } from './codemod.js';
import { IFs, Volume, createFsFromVolume } from 'memfs';

const buildPaths = async (
	fs: IFs,
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
				fs,
				ignore: repomod.excludePatterns?.slice(),
			},
		);

		const flowPaths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			// @ts-expect-error type inconsistency
			fs,
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
			fs,
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
) => {
	const name = 'name' in codemod ? codemod.name : codemod.indexPath;

	printer.info('Running the "%s" codemod using "%s"', name, codemod.engine);

	if (codemod.engine === 'piranha') {
		throw new Error('Piranha not supported');
	}

	if (codemod.engine === 'recipe') {
		// establish a in-memory file system

		const volume = Volume.fromJSON({});
		const mfs = createFsFromVolume(volume);

		for (const c of codemod.codemods) {
			await runCodemod(mfs, printer, c, flowSettings, runSettings);
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
			await handleFormattedFileCommand(
				fileSystem,
				printer,
				runSettings,
				command,
			);
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
					await handleFormattedFileCommand(
						fileSystem,
						printer,
						runSettings,
						command,
					);
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
