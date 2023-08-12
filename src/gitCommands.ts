import { execSync } from 'node:child_process';
import { existsSync, lstatSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

export const isGitDirectory = (directoryPath: string): boolean => {
	const gitPath = join(directoryPath, '.git');
	return existsSync(gitPath) && lstatSync(gitPath).isDirectory();
};

export const isFileInGitDirectory = (filePath: string): boolean => {
	try {
		execSync(`git ls-files --error-unmatch ${filePath}`);
		return true;
	} catch (error) {
		return false;
	}
};

export const getGitDiffForFile = (
	commitHash: string,
	filePath: string,
):
	| { removedCode: string; addedCode: string; firstLineOfCodeBlock: string }[]
	| null => {
	try {
		const diff = execSync(`git diff ${commitHash} --unified=0 ${filePath}`);
		const output = diff.toString();
		const lines = output.split('\n');
		const array = [];
		let removedCode = '';
		let addedCode = '';
		let firstLineOfCodeBlock = '';
		let codeSnippetStarted = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.startsWith('@@')) {
				if (removedCode.length > 0 || addedCode.length > 0) {
					array.push({
						removedCode,
						addedCode,
						firstLineOfCodeBlock,
					});
				}
				codeSnippetStarted = true;
				removedCode = '';
				addedCode = '';
				firstLineOfCodeBlock = (
					line.substring(line.lastIndexOf('@@') + 2) ?? ''
				).trim();
			}
			if (i === lines.length - 1) {
				if (removedCode.length > 0 || addedCode.length > 0) {
					array.push({
						removedCode,
						addedCode,
						firstLineOfCodeBlock,
					});
				}
				break;
			}

			if (!codeSnippetStarted) {
				continue;
			}

			if (line.startsWith('-')) {
				removedCode += line.substring(1).trimEnd() + '\n';
			} else if (line.startsWith('+')) {
				addedCode += line.substring(1).trimEnd() + '\n';
			}
		}

		return array;
	} catch (error) {
		if (!(error instanceof Error)) {
			return null;
		}
		console.error('Error while getting Git diff for file:', error.message);
		return null;
	}
};

export const getLatestCommitHash = (directoryPath: string): string | null => {
	try {
		const gitLog = execSync(`git -C ${directoryPath} log -n 1 --format=%H`);
		return gitLog.toString().trim();
	} catch (error) {
		if (!(error instanceof Error)) {
			return null;
		}
		console.error('Error while getting latest commit hash:', error.message);
		return null;
	}
};

export const findModifiedFiles = (): string[] | null => {
	try {
		const modifiedFiles = execSync('git ls-files --modified', {
			encoding: 'utf-8',
		});
		return modifiedFiles.trim().split('\n');
	} catch (error) {
		console.error('Error finding the modified files:', error);
		return null;
	}
};

export const findLastlyModifiedFile = async (): Promise<string | null> => {
	try {
		const modifiedFiles = execSync('git ls-files --modified', {
			encoding: 'utf-8',
		})
			.trim()
			.split('\n');

		if (modifiedFiles.length === 0) {
			return null;
		}

		let lastlyModifiedFile: string | null = null;
		let maxTimestamp = 0;

		for (const modifiedFile of modifiedFiles) {
			const stats = await stat(modifiedFile);
			const timestamp = stats.mtimeMs;
			
			if (maxTimestamp < timestamp) {
				lastlyModifiedFile = modifiedFile;
				maxTimestamp = timestamp;
			}
		}
		return lastlyModifiedFile;
	} catch (error) {
		console.error('Error finding the modified files:', error);
		return null;
	}
};
