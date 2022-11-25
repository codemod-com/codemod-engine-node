import Axios from "axios";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { extname, join } from "node:path";
import { codemods } from "./codemods";

const fetchCodemods = async () => {
    // const index

    for (const codemod of codemods) {
        const response = await Axios.get(codemod.url, { responseType: 'stream' });

        const hash = createHash('ripemd160').update(codemod.url).digest('base64url');
        const extension = extname(codemod.url);

        const filePath = join(__dirname, `../codemods/${hash}${extension}`);

        response.data.pipe(createWriteStream(filePath));
    }


}

fetchCodemods();