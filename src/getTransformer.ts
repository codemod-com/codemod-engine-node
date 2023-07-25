import * as tsmorph from 'ts-morph';
import nodePath from 'node:path';
import { Repomod } from '@intuita-inc/repomod-engine-api';
import { Dependencies } from './runRepomod.js';

export const getTransformer = (source: string) => {
	type Exports =
		| {
				__esModule?: true;
				default?: unknown;
				handleSourceFile?: unknown;
				repomod?: Repomod<Dependencies>;
		  }
		// eslint-disable-next-line @typescript-eslint/ban-types
		| Function;

	const module = { exports: {} as Exports };
	const req = (name: string) => {
		if (name === 'ts-morph') {
			return tsmorph;
		}

		if (name === 'node:path') {
			return nodePath;
		}
	};

	const keys = ['module', 'require'];
	const values = [module, req];

	// eslint-disable-next-line prefer-spread
	new Function(...keys, source).apply(null, values);

	return typeof module.exports === 'function'
		? module.exports
		: module.exports.__esModule &&
		  typeof module.exports.default === 'function'
		? module.exports.default
		: typeof module.exports.handleSourceFile === 'function'
		? module.exports.handleSourceFile
		: module.exports.repomod !== undefined
		? module.exports.repomod
		: null;
};
