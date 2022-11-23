import yargs from "yargs";
import {hideBin} from "yargs/helpers"

const argv = Promise.resolve<{ pattern: string }>(yargs(hideBin(process.argv))
  .option('pattern', {
    alias: 'p',
    describe: 'Pass the glob pattern for file paths',
    type: 'string',
  })
  .demandOption(['pattern'], 'Please provide the pattern argument to work with nora-node-engine')
  .help()
  .alias('help', 'h').argv);

argv.then(({ pattern }) => {
    console.log(pattern);
});