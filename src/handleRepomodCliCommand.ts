import * as readline from 'node:readline';
import { Repomod } from '@intuita-inc/repomod-engine-api';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { FinishMessage, MessageKind } from './messages.js';
import {
	buildFormattedInternalCommands,
	handleFormattedInternalCommand,
} from './modCommands.js';
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
	formatWithPrettier: boolean;
}>;

// eslint-disable-next-line @typescript-eslint/ban-types
const getRepomod = (args: Arguments): Repomod<any> | null => {
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

	process.stdin.unref();

	const lineHandler = (line: string): void => {
		if (line === 'shutdown') {
			process.stdout.destroy();
			process.exit(0);
		}
	};

	const interfaze = readline.createInterface(process.stdin);
	interfaze.on('line', lineHandler);

	const commands = await runRepomod(
		repomod,
		args.inputPath,
		args.formatWithPrettier,
	);
	const formattedInternalCommands = await buildFormattedInternalCommands(
		commands,
	);

	for (const formattedInternalCommand of formattedInternalCommands) {
		const message = await handleFormattedInternalCommand(
			args.outputDirectoryPath,
			formattedInternalCommand,
		);

		console.log(JSON.stringify(message));
	}

	console.log(JSON.stringify(finishMessage));
};
