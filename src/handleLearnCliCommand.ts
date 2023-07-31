import { Printer } from './printer.js';
import {
	findModifiedFiles,
	getGitDiffForFile,
	getLatestCommitHash,
	isFileInGitDirectory,
} from './gitCommands.js';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';

const encode = (code: string): string =>
	Buffer.from(code).toString('base64url');

const UrlParamKeys = {
	Engine: 'engine' as const,
	BeforeSnippet: 'beforeSnippet' as const,
	AfterSnippet: 'afterSnippet' as const,
	CodemodSource: 'codemodSource' as const,
};

const openURL = (url: string): boolean => {
	// `spawnSync` is used because `execSync` has an input length limit
	let command;
	let args;

	if (process.platform === 'win32') {
		command = 'start';
		args = [url];
	} else {
		command = 'open';
		args = [url];
	}
	// By setting `shell: false`,
	// we avoid potential command-line length limitations
	// and the full URL should be passed to the default web browser without getting truncated

	try {
		spawnSync(command, args, { stdio: 'ignore', shell: false });
		return true;
	} catch (error) {
		console.error('Error while opening URL:', error);
		return false;
	}
};

const createCodemodStudioURL = ({
	engine,
	beforeSnippet,
	afterSnippet,
}: {
	engine: 'jscodeshift' | 'tsmorph';
	beforeSnippet: string;
	afterSnippet: string;
}): string | null => {
	try {
		const encodedEngine = encode(engine);
		const encodedBeforeSnippet = encode(beforeSnippet);
		const encodedAfterSnippet = encode(afterSnippet);

		const url = new URL('https://codemod.studio/');
		const searchParams = new URLSearchParams([
			[UrlParamKeys.Engine, encodedEngine],
			[UrlParamKeys.BeforeSnippet, encodedBeforeSnippet],
			[UrlParamKeys.AfterSnippet, encodedAfterSnippet],
		]);

		url.search = searchParams.toString();

		return url.toString();
	} catch (error) {
		console.error(error);
		return null;
	}
};

export const handleLearnCliCommand = async (
	printer: Printer,
	filePath: string | null,
) => {
	if (filePath !== null && !isFileInGitDirectory(filePath)) {
		printer.log({
			kind: 'error',
			message:
				'The file on which you tried to run operation is not in a git repository.',
		});
		return;
	}

	const modifiedFiles = findModifiedFiles();
	const lastModifiedFile = modifiedFiles?.[modifiedFiles.length - 1] ?? null;

	const path = filePath ?? lastModifiedFile;

	if (path === null) {
		printer.log({
			kind: 'error',
			message:
				'We could not find any modified file to run the command on.',
		});
		return;
	}

	const latestCommitHash = getLatestCommitHash(dirname(path));
	if (latestCommitHash === null) {
		printer.log({
			kind: 'error',
			message:
				'Unexpected error occurred while getting the latest commit hash.',
		});
		return;
	}

	if (modifiedFiles !== null && modifiedFiles.length > 1) {
		printer.warn(
			'Only the changes in the most recently edited file will be processed.',
		);
	}

	printer.info(`Learning \`git diff\` starts on ${path}...`);

	const gitDiff = getGitDiffForFile(latestCommitHash, path);
	if (gitDiff === null) {
		printer.log({
			kind: 'error',
			message:
				'Unexpected error occurred while running `git diff` command.',
		});
		return;
	}

	const { removedCode, addedCode } = gitDiff;

	if (removedCode === '' && addedCode === '') {
		printer.log({
			kind: 'error',
			message:
				'There is no difference between the status of the file and that at the previous commit.',
		});
		return;
	}

	const url = createCodemodStudioURL({
		// TODO: Support other engines in the future
		engine: 'jscodeshift',
		beforeSnippet: removedCode,
		afterSnippet: addedCode,
	});

	if (url === null) {
		printer.log({
			kind: 'error',
			message: 'Unexpected error occurred while creating a URL.',
		});
		return;
	}

	printer.info('Learning went successful! Opening Codemod Studio...');

	const success = openURL(url);
	if (!success) {
		printer.log({
			kind: 'error',
			message: 'Unexpected error occurred while opening Codemod Studio.',
		});
		return;
	}
};