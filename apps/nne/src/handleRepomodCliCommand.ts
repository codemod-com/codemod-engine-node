import { Repomod } from '@intuita-inc/repomod-engine-api';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { FinishMessage, MessageKind } from './messages.js';
import {
	buildFormattedInternalCommands,
	handleFormattedInternalCommand,
} from './modCommands.js';
import { runRepomod } from './repomodRunner.js';
import redwoodjsRepomod from './repomods/redwoodjs.js';
import nextjsRepomod from './repomods/appDirectoryBoilerplate.js';
import { repomod } from './repomods/removeNextOutput.js';

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

const appDirectoryBoilerplateHashDigest = createHash('ripemd160')
	.update('next/13/app-directory-boilerplate')
	.digest('base64url');

const removeNextExportHashDigest = createHash('ripemd160')
	.update('next/13/remove-next-export')
	.digest('base64url');

// eslint-disable-next-line @typescript-eslint/ban-types
const getRepomod = (args: Arguments): Repomod<any> | null => {
	if (args.repomodFilePath === 'redwoodjs_experimental') {
		return redwoodjsRepomod;
	}

	if (args.repomodFilePath === appDirectoryBoilerplateHashDigest) {
		return nextjsRepomod;
	}

	if (args.repomodFilePath === removeNextExportHashDigest) {
		return repomod;
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

export const handleRepomodCliCommand = async (
	args: Arguments,
	executionId: string,
) => {
	const repomod = getRepomod(args);

	if (repomod === null) {
		console.log(JSON.stringify(finishMessage));

		return;
	}

	const commands = await runRepomod(repomod, args.inputPath);
	const formattedInternalCommands = await buildFormattedInternalCommands(
		commands,
	);

	const modId =
		// this is a hacky solution to render a proper name for the boilerplate codemod
		args.repomodFilePath === 'QKEdp-pofR9UnglrKAGDm1Oj6W0'
			? 'next/13/app-directory-boilerplate'
			: args.repomodFilePath;

	for (const formattedInternalCommand of formattedInternalCommands) {
		const message = await handleFormattedInternalCommand(
			args.outputDirectoryPath,
			modId,
			formattedInternalCommand,
			executionId,
		);

		console.log(JSON.stringify(message));
	}

	console.log(JSON.stringify(finishMessage));
};
