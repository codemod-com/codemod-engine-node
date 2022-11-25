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

import { codemods } from '@nne/codemods';

const argv = Promise.resolve<{
	pattern: ReadonlyArray<string>;
	group?: ReadonlyArray<string>;
	outputDirectoryPath?: string;
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

argv.then(async ({ pattern, group, outputDirectoryPath }) => {
	const stream = fastGlob.stream(pattern.slice());

	for await (const data of stream) {
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

				if (!newSource) {
					continue;
				}

				if (oldSource === newSource) {
					continue;
				}

				if (outputDirectoryPath) {
					const hash = createHash('md5')
						.update(filePath)
						.update(codemod.id)
						.digest('base64url');

					const outputFilePath = join(
						outputDirectoryPath,
						`${hash}.txt`,
					);

					await writeFile(outputFilePath, newSource);

					const rewrite = buildRewriteMessage(
						filePath,
						outputFilePath,
						codemod.id,
					);

					console.log(JSON.stringify(rewrite));
				} else {
					const change = buildChangeMessage(
						String(filePath),
						oldSource,
						newSource,
						codemod.id,
					);

					console.log(JSON.stringify(change));
				}
			} catch (error) {
				console.error(error);
			}
		}
	}

	const finishMessage: FinishMessage = {
		k: MessageKind.finish,
	};

	console.log(JSON.stringify(finishMessage));
});
