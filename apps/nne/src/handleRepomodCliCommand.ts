import { Repomod } from '@intuita-inc/repomod-engine-api';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { FinishMessage, MessageKind } from './messages.js';
import { handleCommand } from './modCommands.js';
import { runRepomod } from './repomodRunner.js';

type Exports =
	| Readonly<{
			__esModule?: true;
			default?: unknown;
	  }>
	// eslint-disable-next-line @typescript-eslint/ban-types
	| Function;

type Arguments = Readonly<{
	inputPath: string;
	outputDirectoryPath: string;
	repomodFilePath: string;
}>;

export const handleRepomodCliCommand = async ({
	repomodFilePath,
	inputPath,
	outputDirectoryPath,
}: Arguments) => {
	const source = readFileSync(repomodFilePath, {
		encoding: 'utf8',
	});

	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			noEmitOnError: false,
		},
	});

	const exports: Exports = {};
	const module = { exports };

	const keys = ['module', 'exports'];
	const values = [module, exports];

	new Function(keys.join(), outputText).apply(exports, values);

	if (!exports.__esModule || typeof exports.default !== 'object') {
		return;
	}

	// eslint-disable-next-line @typescript-eslint/ban-types
	const repomod = exports.default as Repomod<{}>;

	const commands = await runRepomod(repomod, inputPath);

	for (const command of commands) {
		const message = await handleCommand(
			outputDirectoryPath,
			'repomod',
			command,
		);

		console.log(JSON.stringify(message));
	}

	const finishMessage: FinishMessage = {
		k: MessageKind.finish,
	};

	console.log(JSON.stringify(finishMessage));
};
