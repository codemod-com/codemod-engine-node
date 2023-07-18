import { runJscodeshiftCodemod, runTsMorphCodemod } from '../codemodRunner.js';
import { Codemod } from '../downloadCodemod.js';
import {
	buildFormattedInternalCommands,
	handleFormattedInternalCommand,
} from '../modCommands.js';
import { readFile } from 'fs/promises';
import { runRepomod } from '../repomodRunner.js';
import { glob } from 'glob';
import type { FlowSettings } from '../executeMainThread.js';
import * as fs from 'fs';
import ts from 'typescript';
import * as tsmorph from 'ts-morph';
import nodePath from 'node:path';

export const runCodemod = async (
	codemod: Codemod,
	flowSettings: FlowSettings,
) => {
	if (codemod.engine === 'piranha') {
		throw new Error('Piranha not supported');
	}

	if (codemod.engine === 'recipe') {
		for (const c of codemod.codemods) {
			await runCodemod(c, flowSettings);
		}

		return;
	}

	// transpile the ESM code to CJS
	const source = fs.readFileSync(codemod.indexPath, {
		encoding: 'utf8',
	});
	const compiledCode = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS },
	});

	type Exports =
		| {
				__esModule?: true;
				default?: unknown;
				handleSourceFile?: unknown;
				repomod?: unknown;
		  }
		// eslint-disable-next-line @typescript-eslint/ban-types
		| Function;

	const exports: Exports = {};
	const module = { exports };
	const req = (name: string) => {
		if (name === 'ts-morph') {
			return tsmorph;
		}

		if (name === 'node:path') {
			return nodePath;
		}
	};

	const keys = ['module', 'exports', 'require'];
	const values = [module, exports, req];

	// eslint-disable-next-line prefer-spread
	new Function(...keys, compiledCode.outputText).apply(null, values);

	const transformer =
		typeof exports === 'function'
			? exports
			: exports.__esModule && typeof exports.default === 'function'
			? exports.default
			: typeof exports.handleSourceFile === 'function'
			? exports.handleSourceFile
			: typeof exports.repomod === 'object'
			? exports.repomod
			: null;

	console.log(
		exports,
		typeof exports.default,
		typeof exports.handleSourceFile,
	);

	if (transformer === null) {
		throw new Error(
			`The transformer cannot be null: ${codemod.indexPath} ${codemod.engine}`,
		);
	}

	if (codemod.engine === 'repomod-engine') {
		const modCommands = await runRepomod(
			transformer,
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
			} catch {
				//
			}
		}
	}
};
