import {
	isMainThread, workerData, Worker
} from 'node:worker_threads';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fastGlob from 'fast-glob';
import jscodeshift, { API, FileInfo } from 'jscodeshift';
import * as readline from 'node:readline';
import { readFileSync } from 'fs';
import { buildChangeMessage } from './buildChangeMessages';
import { FinishMessage, MessageKind, ProgressMessage } from './messages';
import { createHash } from 'crypto';
import { join } from 'path';
import { buildRewriteMessage } from './buildRewriteMessage';

import { codemods as nneCodemods } from '@nne/codemods';
import { codemods as muiCodemods } from '@nne/mui-codemods';
import { writeFileSync } from 'node:fs';

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

if (!isMainThread) {
	const {
		filePath,
		group,
		outputDirectoryPath,
		totalFileCount,
		fileCount,
	} = workerData;

	const oldSource = readFileSync(filePath, { encoding: 'utf8' });

	const codemods = nneCodemods.concat(muiCodemods);

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

				writeFileSync(outputFilePath, newSource);

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

	const progressMessage: ProgressMessage = {
		k: MessageKind.progress,
		p: fileCount,
		t: totalFileCount,
	};

	console.log(JSON.stringify(progressMessage));
}

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



argv.then(async ({ pattern, group, outputDirectoryPath, limit }) => {
	const interfase = readline.createInterface(process.stdin);

	interfase.on('line', async (line) => {
		if (line !== 'shutdown') {
			return;
		}

		process.exit(0);
	});

	const filePaths = await fastGlob(pattern.slice());
	let fileCount = 0;

	const totalFileCount = Math.min(limit, filePaths.length);

	for (const filePath of filePaths) {
		if (limit > 0 && fileCount === limit) {
			break;
		}

		++fileCount;

		await new Promise((resolve) => {
			const worker = new Worker(__filename, {
				workerData: {
					filePath,
					group,
					outputDirectoryPath,
					totalFileCount,
					fileCount,
				},
			});

			const timeout = setTimeout(
				async () => {
					await worker.terminate();
				},
				10000,
			);

			const onEvent = () => {
				clearTimeout(timeout);
				resolve(null);
			}

			worker.on('message', onEvent);
			worker.on('error', onEvent);
			worker.on('exit', onEvent);
		});
	}

	// the client should not rely on the finish message
	const finishMessage: FinishMessage = {
		k: MessageKind.finish,
	};

	console.log(JSON.stringify(finishMessage));

	process.exit(0);
});
