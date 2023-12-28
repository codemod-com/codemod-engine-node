// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import { string } from 'rollup-plugin-string';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
	input: './src/index.ts',
	output: {
		file: './dist/index.cjs',
		format: 'cjs',
		inlineDynamicImports: true,
	},
	plugins: [
		typescript(),
		string({
			// Required to be specified
			include: '**/*.txt',
		}),
		nodeResolve({ modulesOnly: true }),
	],
};
