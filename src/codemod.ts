import * as S from '@effect/schema/Schema';

export const codemodConfigSchema = S.union(
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('piranha'),
		language: S.literal('java'),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('jscodeshift'),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('ts-morph'),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('repomod-engine'),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('recipe'),
		names: S.array(S.string),
	}),
);

export type Codemod =
	| Readonly<{
			source: 'registry';
			name: string;
			engine: 'recipe';
			directoryPath: string;
			codemods: ReadonlyArray<Codemod>;
	  }>
	| Readonly<{
			source: 'registry';
			name: string;
			engine: 'jscodeshift' | 'repomod-engine' | 'ts-morph';
			directoryPath: string;
			indexPath: string;
	  }>
	| Readonly<{
			source: 'registry';
			name: string;
			engine: 'piranha';
			directoryPath: string;
	  }>
	| Readonly<{
			source: 'fileSystem';
			engine: 'jscodeshift' | 'repomod-engine' | 'ts-morph';
			indexPath: string;
	  }>;
