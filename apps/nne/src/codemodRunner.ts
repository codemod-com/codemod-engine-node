import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CreateMessage, MessageKind, RewriteMessage } from './messages';

export type Codemod = Readonly<{
	engine: 'jscodeshift';
	caseTitle: string;
	group: string | null;
	// eslint-disable-next-line @typescript-eslint/ban-types
	transformer: Function;
	withParser: string;
}>;

const buildApi = (parser: string): API => ({
	j: jscodeshift.withParser(parser),
	jscodeshift: jscodeshift.withParser(parser),
	stats: () => {
		console.error(
			'The stats function was called, which is not supported on purpose',
		);
	},
	report: () => {
		console.error(
			'The report function was called, which is not supported on purpose',
		);
	},
});

export const runCodemod = async (
	outputDirectoryPath: string,
	filePath: string,
	oldSource: string,
	codemod: Codemod,
): Promise<ReadonlyArray<CreateMessage | RewriteMessage>> => {
	const messages: (CreateMessage | RewriteMessage)[] = [];

	const createFile = (path: string, data: string): void => {
		const hash = createHash('md5')
			.update(filePath)
			.update(codemod.caseTitle)
			.update(path)
			.digest('base64url');

		const newContentPath = join(outputDirectoryPath, `${hash}.txt`);

		writeFileSync(newContentPath, data);

		messages.push({
			k: MessageKind.create,
			newFilePath: path,
			newContentPath,
		});
	};

	const fileInfo: FileInfo = {
		path: filePath,
		source: oldSource,
	};

	const newSource = codemod.transformer(
		fileInfo,
		buildApi(codemod.withParser),
		{
			createFile,
		},
	);

	if (newSource && oldSource !== newSource) {
		const hash = createHash('md5')
			.update(filePath)
			.update(codemod.caseTitle)
			.digest('base64url');

		const outputFilePath = join(outputDirectoryPath, `${hash}.txt`);

		writeFileSync(outputFilePath, newSource);

		const rewrite: RewriteMessage = {
			k: MessageKind.rewrite,
			i: filePath,
			o: outputFilePath,
			c: codemod.caseTitle,
		};

		messages.push(rewrite);
	}

	return messages;
};
