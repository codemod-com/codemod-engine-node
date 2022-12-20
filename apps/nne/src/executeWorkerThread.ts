import { readFileSync, writeFileSync } from 'node:fs';
import {
	workerData
} from 'node:worker_threads';
import { codemods as nneCodemods } from '@nne/codemods';
import { codemods as muiCodemods } from '@nne/mui-codemods';
import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { buildRewriteMessage } from './buildRewriteMessage';
import { buildChangeMessage } from './buildChangeMessages';
import { MessageKind, ProgressMessage } from './messages';

export const executeWorkerThread = () => {
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

    const {
		codemodFilePath,
		group,
		filePath,
		outputDirectoryPath,
		totalFileCount,
		fileCount,
	} = workerData;

	const oldSource = readFileSync(filePath, { encoding: 'utf8' });

	const codemods = codemodFilePath ?
		[
			{
				caseTitle: codemodFilePath,
				group: null,
				transformer: require(codemodFilePath),
				withParser: 'tsx',
			}
		]
		: nneCodemods.concat(muiCodemods);

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