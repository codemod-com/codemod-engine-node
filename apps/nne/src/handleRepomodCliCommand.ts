import { Repomod } from '@intuita-inc/repomod-engine-api';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { FinishMessage, MessageKind } from './messages.js';
import { handleCommand } from './modCommands.js';
import { runRepomod } from './repomodRunner.js';
import redwoodjsRepomod from './repomods/redwoodjs.js';

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

// eslint-disable-next-line @typescript-eslint/ban-types
const getRepomod = (args: Arguments): Repomod<any> | null => {
	if (args.repomodFilePath === 'redwoodjs') {
		return redwoodjsRepomod;
	}

	const source = readFileSync(args.repomodFilePath, {
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
		return null;
	}

	return exports.default as Repomod<any>;
};

const finishMessage: FinishMessage = {
	k: MessageKind.finish,
};

export const handleRepomodCliCommand = async (args: Arguments) => {
	const repomod = getRepomod(args);

	if (repomod === null) {
		console.log(JSON.stringify(finishMessage));

		return;
	}

	const commands = await runRepomod(repomod, args.inputPath);

	for (const command of commands) {
		const message = await handleCommand(
			args.outputDirectoryPath,
			'repomod',
			command,
		);

		console.log(JSON.stringify(message));
	}

	console.log(JSON.stringify(finishMessage));
};
