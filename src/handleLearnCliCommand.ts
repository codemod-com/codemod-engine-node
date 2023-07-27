import { Printer } from './printer.js';
import {
	getGitDiffForFile,
	getLatestCommitHash,
	isFileInGitDirectory,
} from './gitCommands.js';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';

const encode = (code: string): string => {
	const buffer = Buffer.from(code);
	return buffer.toString('base64url');
};

const UrlParamKeys = {
	engine: 'engine' as const,
	beforeSnippet: 'beforeSnippet' as const,
	afterSnippet: 'afterSnippet' as const,
	codemodSource: 'codemodSource' as const,
};

const openURL = (url: string): boolean => {
	// `spawnSync` is used because `execSync` has an input length limit
	let command;
	let args;

	if (process.platform === 'win32') {
		command = 'start';
		args = [url];
	} else if (process.platform === 'darwin') {
		command = 'open';
		args = [url];
	} else {
		try {
			spawnSync('xdg-open', [url], { stdio: 'ignore', shell: true });
			return true;
		} catch (error) {
			command = 'gnome-open';
			args = [url];
			return false;
		}
	}

	try {
		spawnSync(command, args, { stdio: 'ignore', shell: true });
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
			[UrlParamKeys.engine, encodedEngine],
			[UrlParamKeys.beforeSnippet, encodedBeforeSnippet],
			[UrlParamKeys.afterSnippet, encodedAfterSnippet],
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
	filePath: string,
) => {
	if (!isFileInGitDirectory(filePath)) {
		printer.log({
			kind: 'error',
			message:
				'The file on which you tried to run operation is not in a git repository.',
		});
		return;
	}

	const latestCommitHash = getLatestCommitHash(dirname(filePath));
	if (latestCommitHash === null) {
		printer.log({
			kind: 'error',
			message:
				'Unexpected error occurred while getting the latest commit hash.',
		});
		return;
	}

	printer.log({
		kind: 'info',
		message: `Learning \`git diff\` in ${filePath}...`,
	});

	const gitDiff = getGitDiffForFile(latestCommitHash, filePath);
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

	printer.log({
		kind: 'info',
		message: 'Learning went successful! Opening Codemod Studio...',
	});

	const success = openURL(url);
	if (!success) {
		printer.log({
			kind: 'error',
			message: 'Unexpected error occurred while opening Codemod Studio.',
		});
		return;
	}
};
