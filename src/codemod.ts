import { Arguments } from './schemata/argumentsSchema.js';

export const CODEMOD_ENGINES = [
	'jscodeshift',
	'repomod-engine',
	'filemod',
	'ts-morph',
] as const;
export type CodemodEngine = (typeof CODEMOD_ENGINES)[number];
export function isSupportedEngine(engine: string): engine is CodemodEngine {
	return !!CODEMOD_ENGINES.includes(engine as CodemodEngine);
}

export type Codemod =
	| Readonly<{
			source: 'registry';
			name: string;
			engine: 'recipe';
			directoryPath: string;
			codemods: ReadonlyArray<Codemod>;
			arguments: Arguments;
	  }>
	| Readonly<{
			source: 'registry';
			name: string;
			engine: CodemodEngine;
			directoryPath: string;
			indexPath: string;
			arguments: Arguments;
	  }>
	| Readonly<{
			source: 'registry';
			name: string;
			engine: 'piranha';
			directoryPath: string;
			arguments: Arguments;
	  }>
	| Readonly<{
			source: 'fileSystem';
			engine: CodemodEngine;
			indexPath: string;
	  }>;
