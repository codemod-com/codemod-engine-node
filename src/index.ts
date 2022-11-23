import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fastGlob from 'fast-glob';
import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { readFileSync } from 'fs';
import { buildChangeMessages } from './buildChangeMessages';
import { FinishMessage, MessageKind } from './messages';
import { codemods } from './codemods';

const argv = Promise.resolve<{ pattern: string }>(
	yargs(hideBin(process.argv))
		.option('pattern', {
			alias: 'p',
			describe: 'Pass the glob pattern for file paths',
			type: 'string',
		})
		.demandOption(
			['pattern'],
			'Please provide the pattern argument to work with nora-node-engine',
		)
		.help()
		.alias('help', 'h').argv,
);

const api: API = {
	j: jscodeshift,
	jscodeshift,
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
};

argv.then(async ({ pattern }) => {
	const stream = fastGlob.stream(pattern);

	for await (const filePath of stream) {
		const oldSource = readFileSync(filePath, { encoding: 'utf8' });

		try {
			for (const codemod of codemods) {
				const fileInfo: FileInfo = {
					path: String(filePath),
					source: oldSource,
				};

				const newSource = codemod.transformer(fileInfo, api);

				const changes = buildChangeMessages(
					String(filePath),
					oldSource,
					newSource,
					codemod.id,
				);

				for (const change of changes) {
					console.log(JSON.stringify(change));
				}
			}
		} catch (error) {
			console.error(error);
		}
	}

	const finishMessage: FinishMessage = {
		k: MessageKind.finish,
	};

	console.log(JSON.stringify(finishMessage));
});
