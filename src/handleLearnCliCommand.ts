import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import * as S from '@effect/schema/Schema';
import { downloadFile } from './fileSystemUtilities.js';
import { Printer } from './printer.js';
import open from 'open';
import { isFileInGitDirectory } from './gitCommands.js';

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

	const buffer = await downloadFile(
		'https://intuita-public.s3.us-west-1.amazonaws.com/codemod-registry/names.json',
		path,
		cache,
	);

	const data = buffer.toString('utf8');

	const parsedJson = JSON.parse(data);

	const names = S.parseSync(S.array(S.string))(parsedJson);

	printer.log({ kind: 'names', names });

	await open('https://sindresorhus.com');
};
