import { runJscodeshiftCodemod } from './runJscodeshiftCodemod.js';
import { Codemod } from './downloadCodemod.js';
import {
	buildFormattedFileCommands,
	handleFormattedFileCommand,
} from './fileCommands.js';
import { readFile } from 'fs/promises';
import { Dependencies, runRepomod } from './runRepomod.js';
import { escape, glob } from 'glob';
import type { FlowSettings, RunSettings } from './executeMainThread.js';
import * as fs from 'fs';
import * as tsmorph from 'ts-morph';
import nodePath from 'node:path';
import { Repomod } from '@intuita-inc/repomod-engine-api';
import { runTsMorphCodemod } from './runTsMorphCodemod.js';
import { Printer } from './printer.js';

export const runCodemod = async (
	printer: Printer,
	codemod: Codemod,
	flowSettings: FlowSettings,
	runSettings: RunSettings,
) => {
	printer.info(
		'Running the "%s" codemod using "%s"',
		codemod.name,
		codemod.engine,
	);

	if (codemod.engine === 'piranha') {
		throw new Error('Piranha not supported');
	}

	if (codemod.engine === 'recipe') {
		for (const c of codemod.codemods) {
			await runCodemod(printer, c, flowSettings, runSettings);
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

		const repomodPaths = await glob(
			repomod.includePatterns?.slice() ?? [],
			{
				absolute: true,
				cwd: flowSettings.inputDirectoryPath,
				fs,
				ignore: repomod.excludePatterns?.slice(),
			},
		);

		const flowPaths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			fs,
			ignore: flowSettings.excludePattern.slice(),
		});

		const paths = repomodPaths
			.filter((path) => flowPaths.includes(path))
			.map((path) => escape(path));

		const fileCommands = await runRepomod(
			{ ...repomod, includePatterns: paths, excludePatterns: [] },
			flowSettings.inputDirectoryPath,
			flowSettings.usePrettier,
		);

		const formattedFileCommands = await buildFormattedFileCommands(
			fileCommands,
		);

		for (const command of formattedFileCommands) {
			await handleFormattedFileCommand(printer, runSettings, command);
		}
	} else {
		const globbedPaths = await glob(flowSettings.includePattern.slice(), {
			absolute: true,
			cwd: flowSettings.inputDirectoryPath,
			fs,
			ignore: flowSettings.excludePattern.slice(),
			nodir: true,
		});

		const paths = globbedPaths.slice(0, flowSettings.fileLimit);

		for (const path of paths) {
			printer.info(
				'Running the "%s" codemod against "%s"',
				codemod.name,
				path,
			);

			try {
				const data = await readFile(path, 'utf8');

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
