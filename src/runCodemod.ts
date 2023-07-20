import { runJscodeshiftCodemod, runTsMorphCodemod } from './codemodRunner.js';
import { Codemod } from './downloadCodemod.js';
import {
	buildFormattedInternalCommands,
	handleFormattedInternalCommand,
} from './modCommands.js';
import { readFile } from 'fs/promises';
import { Dependencies, runRepomod } from './repomodRunner.js';
import { escape, glob } from 'glob';
import type { FlowSettings } from './executeMainThread.js';
import * as fs from 'fs';
import * as tsmorph from 'ts-morph';
import nodePath from 'node:path';
import { Repomod } from '@intuita-inc/repomod-engine-api';

export const runCodemod = async (
	codemod: Codemod,
	flowSettings: FlowSettings,
) => {
	console.log(
		'Running the "%s" codemod using "%s"',
		codemod.name,
		codemod.engine,
	);

	if (codemod.engine === 'piranha') {
		throw new Error('Piranha not supported');
	}

	if (codemod.engine === 'recipe') {
		for (const c of codemod.codemods) {
			await runCodemod(c, flowSettings);
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

		const modCommands = await runRepomod(
			{ ...repomod, includePatterns: paths, excludePatterns: [] },
			flowSettings.inputDirectoryPath,
			flowSettings.usePrettier,
		);

		const formattedInternalCommands = await buildFormattedInternalCommands(
			modCommands,
		);

		for (const command of formattedInternalCommands) {
			await handleFormattedInternalCommand(
				'', // TODO fix me
				command,
				false,
			);
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
			console.log(
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

				const formattedInternalCommands =
					await buildFormattedInternalCommands(modCommands);

				for (const command of formattedInternalCommands) {
					await handleFormattedInternalCommand(
						'', // TODO fix me
						command,
						false,
					);
				}
			} catch (error) {
				console.error(error);
			}
		}
	}
};
