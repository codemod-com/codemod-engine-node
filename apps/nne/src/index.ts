import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fastGlob from 'fast-glob';
import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { readFileSync } from 'fs';
import { buildChangeMessage } from './buildChangeMessages';
import { FinishMessage, MessageKind } from './messages';
import { writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';
import { buildRewriteMessage } from './buildRewriteMessage';

import { codemods as nneCodemods } from '@nne/codemods';
import { codemods as muiCodemods } from '@nne/mui-codemods';

const codemods = nneCodemods.concat(muiCodemods);

const argv = Promise.resolve<{
	pattern: ReadonlyArray<string>;
	group?: ReadonlyArray<string>;
	outputDirectoryPath?: string;
	limit?: number,
}>(
	yargs(hideBin(process.argv))
		.option('pattern', {
			alias: 'p',
			describe: 'Pass the glob pattern for file paths',
			array: true,
			type: 'string',
		})
		.option('group', {
			alias: 'g',
			describe: 'Pass the group(s) of codemods for execution',
			array: true,
			type: 'string',
		})
		.option('limit', {
			alias: 'l',
			describe: 'Pass the limit for the number of files to inspect',
			array: false,
			type: 'number',
		})
		.option('outputDirectoryPath', {
			alias: 'o',
			describe:
				'Pass the output directory path to save output files within in',
			type: 'string',
		})
		.demandOption(
			['pattern'],
			'Please provide the pattern argument to work with nora-node-engine',
		)
		.help()
		.alias('help', 'h').argv,
);

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

argv.then(async ({ pattern, group, outputDirectoryPath, limit }) => {
	const stream = fastGlob.stream(pattern.slice());
	let fileCount = 0;

	for await (const data of stream) {
		if (limit && fileCount === limit) {
			break;
		}

		++fileCount;

		const filePath = String(data);

		const oldSource = readFileSync(filePath, { encoding: 'utf8' });

		for (const codemod of codemods) {
			if (group && !group.includes(codemod.group)) {
				continue;
			}

			const fileInfo: FileInfo = {
				path: filePath,
				source: oldSource,
			};

			try {
				const newSource = codemod.transformer(
					fileInfo,
					buildApi(codemod.withParser),
					{},
				);

				if (!newSource || oldSource === newSource) {
					continue;
				}

				if (outputDirectoryPath) {
					const hash = createHash('md5')
						.update(filePath)
						.update(codemod.caseTitle)
						.digest('base64url');

					const outputFilePath = join(
						outputDirectoryPath,
						`${hash}.txt`,
					);

					await writeFile(outputFilePath, newSource);

					const rewrite = buildRewriteMessage(
						filePath,
						outputFilePath,
						codemod.caseTitle,
					);

					console.log(JSON.stringify(rewrite));
				} else {
					const change = buildChangeMessage(
						String(filePath),
						oldSource,
						newSource,
						codemod.caseTitle,
					);

					console.log(JSON.stringify(change));
				}
			} catch (error) {
				if (error instanceof Error) {
					console.error(JSON.stringify({
						message: error.message,
						caseTitle: codemod.caseTitle,
						group: codemod.group,
					}));
				}
			}
		}
	}

	const finishMessage: FinishMessage = {
		k: MessageKind.finish,
	};

	console.log(JSON.stringify(finishMessage));
});
