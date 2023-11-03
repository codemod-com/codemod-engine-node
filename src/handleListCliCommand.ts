import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import * as S from '@effect/schema/Schema';
import type { FileDownloadService } from './fileDownloadService.js';
import type { PrinterBlueprint } from './printer.js';

export const handleListNamesCommand = async (
	fileDownloadService: FileDownloadService,
	printer: PrinterBlueprint,
) => {
	const intuitaDirectoryPath = join(homedir(), '.intuita');

	await mkdir(intuitaDirectoryPath, { recursive: true });

	const path = join(intuitaDirectoryPath, 'names.json');

	const buffer = await fileDownloadService.download(
		'https://intuita-public.s3.us-west-1.amazonaws.com/codemod-registry/names.json',
		path,
	);

	const data = buffer.toString('utf8');

	const parsedJson = JSON.parse(data);

	const names = S.parseSync(S.array(S.string))(parsedJson);

	printer.log({ kind: 'names', names });
};
