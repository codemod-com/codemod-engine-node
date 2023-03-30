import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
	input: './src/index.ts',
	output: {
		dir: 'build-rollup',
		format: 'cjs',
	},
	plugins: [typescript(), json(), nodeResolve(), commonjs()],
};
