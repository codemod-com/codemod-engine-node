import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

type CodemodObject =
	| Readonly<{
			engine: 'jscodeshift';
			group: string;
			caseTitle: string;
			transformer: string;
			withParser: string;
	  }>
	| {
			engine: 'filemod-engine';
			group: string;
			caseTitle: string;
			transformerPath: string;
	  };

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
		const configJsonPath = join(
			setsDirectoryPath,
			setDirectoryPath,
			'config.json',
		);

		const jsonConfig = await readFile(configJsonPath, { encoding: 'utf8' });
		const setConfig = JSON.parse(jsonConfig);

		for (const codemod of setConfig.codemods) {
			const codemodDirectoryPath = join(
				dirname,
				'../../../codemod-registry/codemods/',
				codemod,
			);

			const codemodConfigPath = join(codemodDirectoryPath, 'config.json');

			const jsonConfig = await readFile(codemodConfigPath, {
				encoding: 'utf8',
			});
			const config = JSON.parse(jsonConfig);

			if (config.engine === 'jscodeshift') {
				const hash = createHash('ripemd160')
					.update(config.name)
					.digest('hex');
				const codemodDirname = join(dirname, `./codemods/${hash}/`);
				if (!existsSync(codemodDirname)) {
					await mkdir(codemodDirname);
				}
				{
					const tsPath = join(codemodDirectoryPath, 'index.ts');
					const jsPath = join(codemodDirectoryPath, 'index.js');
					const path = existsSync(tsPath) ? tsPath : jsPath;
					if (!existsSync(path)) {
						throw new Error(`${path} does not exists`);
					}
					const ext = extname(path);
					const readStream = createReadStream(path);
					const filePath = join(codemodDirname, `index${ext}`);
					if (!existsSync(filePath)) {
						readStream.pipe(createWriteStream(filePath));
					}
				}
				writeStream.write(
					`import transformer${hash} from './codemods/${hash}';\n`,
				);
				codemodObjects.push({
					engine: 'jscodeshift',
					caseTitle: config.name,
					group: setConfig.name,
					transformer: `transformer${hash}`,
					withParser: 'tsx',
				});
			}

			if (config.engine === 'filemod-engine') {
				console.log(config);

				const hash = createHash('ripemd160')
					.update(config.name)
					.digest('hex');

				const codemodDirname = join(dirname, `./codemods/${hash}/`);

				if (!existsSync(codemodDirname)) {
					await mkdir(codemodDirname);
				}

				const transformYmlPath = join(
					codemodDirectoryPath,
					'transform.yml',
				);

				if (!existsSync(transformYmlPath)) {
					throw new Error(`${transformYmlPath} does not exists`);
				}

				const readStream = createReadStream(transformYmlPath);

				const filePath = join(codemodDirname, `transform.yml`);

				if (!existsSync(filePath)) {
					readStream.pipe(createWriteStream(filePath));
				}

				codemodObjects.push({
					engine: 'filemod-engine',
					caseTitle: config.name,
					group: setConfig.name,
					transformerPath: `./${hash}/transform.yml`,
				});
			}
		}
	}

	const stringifiedObjects = codemodObjects
		.map((codemodObject) => {
			return (
				'\t{\n' +
				`\t\t"engine": "${codemodObject.engine}",\n` +
				`\t\t"caseTitle": "${codemodObject.caseTitle}",\n` +
				`\t\t"group": "${codemodObject.group}",\n` +
				('transformer' in codemodObject
					? `\t\t"transformer": ${codemodObject.transformer},\n`
					: '') +
				('withParser' in codemodObject
					? `\t\t"withParser": "${codemodObject.withParser}",\n`
					: '') +
				('transformerPath' in codemodObject
					? `\t\t"transformerPath": "${codemodObject.transformerPath}",\n`
					: '') +
				'\t},\n'
			);
		})
		.join('');

	writeStream.write(`\nexport const codemods = [\n${stringifiedObjects}];\n`);

	writeStream.end();
};

fetchCodemods();
