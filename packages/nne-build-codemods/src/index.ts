import Axios from "axios";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { codemods } from "./codemods";

type CodemodObject = Readonly<{
    id: string,
	group: string,
	transformer: string,
}>;

const dirname = join(__dirname, '../../nne-codemods/src/');

const fetchCodemods = async () => {
    const indexFilePath = join(dirname, './index.ts');
    const writeStream = createWriteStream(indexFilePath);

    const codemodObjects: CodemodObject[] = [];

    for (const codemod of codemods) {
        const response = await Axios.get(codemod.url, { responseType: 'stream' });

        const hash = createHash('ripemd160').update(codemod.url).digest('hex');
        const extension = extname(codemod.url);

        const filePath = join(dirname, `./codemods/${hash}${extension}`);

        if(!existsSync(filePath)) {
            response.data.pipe(createWriteStream(filePath));
        }

        writeStream.write(`import transformer${hash} from './codemods/${hash}'\n`);

        codemodObjects.push({
            id: hash,
            group: hash,
            transformer: `transformer${hash}`,
        })
    }

    const stringifiedObjects = codemodObjects.map(({ id, group, transformer }) => {
        return '\t{\n' +
            `\t\t"id": "${id}",\n` +
            `\t\t"group": "${group}",\n` +
            `\t\t"transformer": ${transformer},\n` +
        '\t},\n';
    }).join('');

    writeStream.write(`\nexport const codemods = [\n${stringifiedObjects}]\n`);

    writeStream.end();
}

fetchCodemods();