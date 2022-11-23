import yargs from "yargs";
import {hideBin} from "yargs/helpers"
import fastGlob from 'fast-glob';
import jscodeshift from "jscodeshift";
import { readFileSync } from "fs";

const argv = Promise.resolve<{ pattern: string }>(yargs(hideBin(process.argv))
  .option('pattern', {
    alias: 'p',
    describe: 'Pass the glob pattern for file paths',
    type: 'string',
  })
  .demandOption(['pattern'], 'Please provide the pattern argument to work with nora-node-engine')
  .help()
  .alias('help', 'h').argv);

argv.then(async ({ pattern }) => {
    console.log(pattern);

    const filePaths = await fastGlob(pattern);

    for (const filePath of filePaths) {
        const source = readFileSync(filePath, { encoding: 'utf8' });

        console.log(filePath);

        try {
            const collection = jscodeshift.withParser('tsx')(source)
        } catch (error) {
            console.log(error);
        }

        
    }

    console.log('finish');
});