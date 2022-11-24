import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fastGlob from 'fast-glob';
import jscodeshift, { API, FileInfo } from 'jscodeshift';
import { readFileSync } from 'fs';
import { buildChangeMessage } from './buildChangeMessages';
import { FinishMessage, MessageKind } from './messages';
import { codemods } from './codemods';

const argv = Promise.resolve<{
	pattern: string;
	group?: ReadonlyArray<string>;
}>(
	yargs(hideBin(process.argv))
		.option('pattern', {
			alias: 'p',
			describe: 'Pass the glob pattern for file paths',
			type: 'string',
		})
		.option('group', {
			alias: 'g',
			describe: 'Pass the group(s) of codemods for execution',
			array: true,
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

argv.then(async ({ pattern, group }) => {
	const stream = fastGlob.stream(pattern);

	for await (const filePath of stream) {
		const oldSource = readFileSync(filePath, { encoding: 'utf8' });

		for (const codemod of codemods) {
			if (group && !group.includes(codemod.group)) {
				continue;
			}

			const fileInfo: FileInfo = {
				path: String(filePath),
				source: oldSource,
			};

			try {
				const newSource = codemod.transformer(fileInfo, api);

				const change = buildChangeMessage(
					String(filePath),
					oldSource,
					newSource,
					codemod.id,
				);

				if (change) {
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
