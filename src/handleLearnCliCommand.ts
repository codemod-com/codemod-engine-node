import { Printer } from './printer.js';
import {
	findLastlyModifiedFile,
	findModifiedFiles,
	getGitDiffForFile,
	getLatestCommitHash,
	isFileInGitDirectory,
} from './gitCommands.js';
import { execSync, spawnSync } from 'node:child_process';
import { dirname, extname } from 'node:path';
import { Project } from 'ts-morph';
import { doubleQuotify } from './utils.js';

// remove all special characters and whitespaces
const removeSpecialCharacters = (str: string) =>
	str.replace(/[{}()[\]:;,/?'"<>|=`!]/g, '').replace(/\s/g, '');

const isJSorTS = (name: string) =>
	name.startsWith('.ts') || name.startsWith('.js');

const getFileExtension = (filePath: string) => {
	return extname(filePath).toLowerCase();
};

const getOldSourceFile = (
	commitHash: string,
	filePath: string,
	fileExtension: string,
) => {
	if (!isJSorTS(fileExtension)) {
		return null;
	}

	try {
		const commitWithFileName = doubleQuotify(`${commitHash}:${filePath}`);
		const output = execSync(`git show ${commitWithFileName}`).toString();

		const project = new Project({
			useInMemoryFileSystem: true,
			compilerOptions: {
				allowJs: true,
			},
		});

		return project.createSourceFile(filePath, output);
	} catch (error) {
		console.error(error);
		return null;
	}
};

const getSourceFile = (filePath: string, fileExtension: string) => {
	if (!isJSorTS(fileExtension)) {
		return null;
	}

	const project = new Project({
		compilerOptions: {
			allowJs: true,
		},
	});

	return project.addSourceFileAtPathIfExists(filePath) ?? null;
};

const encode = (code: string): string =>
	Buffer.from(code).toString('base64url');

const UrlParamKeys = {
	Engine: 'engine' as const,
	BeforeSnippet: 'beforeSnippet' as const,
	AfterSnippet: 'afterSnippet' as const,
	CodemodSource: 'codemodSource' as const,
	Command: 'command' as const,
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
			[UrlParamKeys.Command, 'learn'],
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

	const path = filePath ?? (await findLastlyModifiedFile());

	if (path === null) {
		printer.log({
			kind: 'error',
			message:
				'We could not find any modified file to run the command on.',
		});
		return;
	}

	const fileExtension = getFileExtension(path);

	if (!isJSorTS(fileExtension)) {
		printer.log({
			kind: 'error',
			message: 'File must be either a JavaScript or TypeScript file.',
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

	const modifiedFiles = findModifiedFiles();
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

	if (gitDiff.length === 0) {
		printer.log({
			kind: 'error',
			message:
				'There is no difference between the status of the file and that at the previous commit.',
		});
		return;
	}

	const oldSourceFile = getOldSourceFile(
		latestCommitHash,
		path,
		fileExtension,
	);
	const sourceFile = getSourceFile(path, fileExtension);

	if (oldSourceFile === null || sourceFile === null) {
		printer.log({
			kind: 'error',
			message: 'Unexpected error occurred while getting AST of the file.',
		});
		return;
	}

	const beforeNodeTexts = new Set<string>();
	const afterNodeTexts = new Set<string>();

	const lines = gitDiff.split('\n');

	for (const line of lines) {
		if (!line.startsWith('-') && !line.startsWith('+')) {
			continue;
		}

		const codeString = line.substring(1).trim();
		if (removeSpecialCharacters(codeString).length === 0) {
			continue;
		}

		if (line.startsWith('-')) {
			oldSourceFile.forEachChild((node) => {
				const content = node.getFullText();

				if (
					content.includes(codeString) &&
					!beforeNodeTexts.has(content)
				) {
					beforeNodeTexts.add(content);
				}
			});
		}

		if (line.startsWith('+')) {
			sourceFile.forEachChild((node) => {
				const content = node.getFullText();
				if (
					content.includes(codeString) &&
					!afterNodeTexts.has(content)
				) {
					afterNodeTexts.add(content);
				}
			});
		}
	}

	const irrelevantNodeTexts = new Set<string>();

	beforeNodeTexts.forEach((text) => {
		if (afterNodeTexts.has(text)) {
			irrelevantNodeTexts.add(text);
		}
	});

	irrelevantNodeTexts.forEach((text) => {
		beforeNodeTexts.delete(text);
		afterNodeTexts.delete(text);
	});

	const beforeSnippet = Array.from(beforeNodeTexts)
		.join('')
		// remove all occurrences of `\n` at the beginning
		.replace(/^\n+/, '');
	const afterSnippet = Array.from(afterNodeTexts)
		.join('')
		// remove all occurrences of `\n` at the beginning
		.replace(/^\n+/, '');
	const url = createCodemodStudioURL({
		// TODO: Support other engines in the future
		engine: 'jscodeshift',
		beforeSnippet,
		afterSnippet,
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
