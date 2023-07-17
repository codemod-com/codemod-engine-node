import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import * as S from '@effect/schema/Schema';
import { downloadFile } from './fileSystemUtilities.js';

export const handleListNamesCommand = async (useJson: boolean) => {
	const intuitaDirectoryPath = join(homedir(), '.intuita');

	await mkdir(intuitaDirectoryPath, { recursive: true });

	const path = join(intuitaDirectoryPath, 'names.json');

	const buffer = await downloadFile(
		'https://intuita-public.s3.us-west-1.amazonaws.com/codemod-registry/names.json',
		path,
	);

	const data = buffer.toString('utf8');

	if (useJson) {
		console.log(data);

		return;
	}

	try {
		const parsedJson = JSON.parse(data);

		const names = S.parseSync(S.array(S.string))(parsedJson);

		for (const name of names) {
			console.log(name);
		}
	} catch (error) {
		console.error(error);
	}
};
