import Axios from 'axios';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { codemods } from './codemods';

type CodemodObject = Readonly<{
	group: string;
	caseTitle: string;
	transformer: string;
	withParser: string;
}>;

const dirname = join(__dirname, '../../nne-codemods/src/');

const fetchCodemods = async () => {
	const indexFilePath = join(dirname, './index.ts');
	const writeStream = createWriteStream(indexFilePath);

	const codemodObjects: CodemodObject[] = [];

	/**
	 * use the codemod registry
	 */

	const setsDirectoryPath = join(dirname, '../../../codemod-registry/sets');

	const setDirectoryPaths = await readdir(setsDirectoryPath);

	for (const setDirectoryPath of setDirectoryPaths) {
		const configJsonPath = join(setsDirectoryPath, setDirectoryPath, 'config.json');

		const jsonConfig = await readFile(configJsonPath, { encoding: 'utf8' });
		const setConfig = JSON.parse(jsonConfig);

		for (const codemod of setConfig.codemods) {
			const codemodDirectoryPath = join(dirname, '../../../codemod-registry/codemods/', codemod);

			const codemodConfigPath = join(codemodDirectoryPath, 'config.json');

			const jsonConfig = await readFile(codemodConfigPath, { encoding: 'utf8' });
			const config = JSON.parse(jsonConfig);

			const hash = createHash('ripemd160').update(config.name).digest('hex');

			const codemodDirname = join(dirname, `./codemods/registry_${hash}/`);

			if (!existsSync(codemodDirname)) {
				await mkdir(codemodDirname);
			}

			{
				const readStream = createReadStream(join(codemodDirectoryPath, 'index.ts'));
				const filePath = join(codemodDirname, `index.ts`);
	
				if (!existsSync(filePath)) {
					readStream.pipe(createWriteStream(filePath));
				}
			}

			writeStream.write(
				`import transformer${hash} from './codemods/registry_${hash}';\n`,
			);
	
			codemodObjects.push({
				caseTitle: config.name,
				group: setConfig.name,
				transformer: `transformer${hash}`,
				withParser: 'tsx',
			});
		}
	}

	for (const codemod of codemods) {
		// TODO
		// drop later
		continue;

		const hash = createHash('ripemd160').update(codemod.url).digest('hex');
		const extension = extname(codemod.url);

		const codemodDirname = join(dirname, `./codemods/${hash}/`);

		await mkdir(codemodDirname);

		{
			const response = await Axios.get(codemod.url, {
				responseType: 'stream',
			});

			const filePath = join(codemodDirname, `index${extension}`);

			if (!existsSync(filePath)) {
				response.data.pipe(createWriteStream(filePath));
			}
		}

		{
			// LICENSE
			const response = await Axios.get(codemod.license, {
				responseType: 'stream',
			});

			const filePath = join(codemodDirname, `LICENSE`);

			if (!existsSync(filePath)) {
				response.data.pipe(createWriteStream(filePath));
			}
		}

		writeStream.write(
			`import transformer${hash} from './codemods/${hash}'\n`,
		);

		codemodObjects.push({
			caseTitle: codemod.caseTitle,
			group: codemod.group,
			transformer: `transformer${hash}`,
			withParser: codemod.withParser,
		});
	}

	const stringifiedObjects = codemodObjects
		.map(({ caseTitle, group, transformer, withParser }) => {
			return (
				'\t{\n' +
				`\t\t"caseTitle": "${caseTitle}",\n` +
				`\t\t"group": "${group}",\n` +
				`\t\t"transformer": ${transformer},\n` +
				`\t\t"withParser": "${withParser}",\n` +
				'\t},\n'
			);
		})
		.join('');

	writeStream.write(`\nexport const codemods = [\n${stringifiedObjects}];\n`);

	writeStream.end();
};

fetchCodemods();
