import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import * as S from '@effect/schema/Schema';
import { downloadFile } from './fileSystemUtilities.js';
import { Printer } from './printer.js';

export const handleListNamesCommand = async (printer: Printer) => {
	const intuitaDirectoryPath = join(homedir(), '.intuita');

	await mkdir(intuitaDirectoryPath, { recursive: true });

	const path = join(intuitaDirectoryPath, 'names.json');

	const buffer = await downloadFile(
		'https://intuita-public.s3.us-west-1.amazonaws.com/codemod-registry/names.json',
		path,
		false,
	);

	const data = buffer.toString('utf8');

	const parsedJson = JSON.parse(data);

	const names = S.parseSync(S.array(S.string))(parsedJson);

	printer.log({ kind: 'names', names });
};
