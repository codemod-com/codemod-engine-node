import { Printer } from './printer.js';
import open from 'open';
import {
	getGitDiffForFile,
	getLatestCommitHash,
	isFileInGitDirectory,
} from './gitCommands.js';

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

const createCodemodStudioURL = ({
	engine,
	beforeSnippet,
	afterSnippet,
}: {
	engine: 'jscodeshift' | 'tsmorph';
	beforeSnippet: string;
	afterSnippet: string;
}): URL | null => {
	try {
		const encodedEngine = encode(engine);
		const encodedInputSnippet = encode(beforeSnippet);
		const encodedOutputSnippet = encode(afterSnippet);

		const searchParams = new URLSearchParams(window.location.search);
		searchParams.set(UrlParamKeys.engine, encodedEngine);
		searchParams.set(UrlParamKeys.beforeSnippet, encodedInputSnippet);
		searchParams.set(UrlParamKeys.afterSnippet, encodedOutputSnippet);

		const url = new URL('https://codemod.studio/');
		url.search = searchParams.toString();

		return url;
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

	const latestCommitHash = getLatestCommitHash(filePath);
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
	await open(url.toString());
};
