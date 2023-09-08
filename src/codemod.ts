import * as S from '@effect/schema/Schema';

const argumentsSchema = S.array(
	S.union(
		S.struct({
			name: S.string,
			kind: S.literal('string'),
			default: S.union(S.string, S.undefined),
		}),
		S.struct({
			name: S.string,
			kind: S.literal('number'),
			default: S.union(S.number, S.undefined),
		}),
		S.struct({
			name: S.string,
			kind: S.literal('boolean'),
			default: S.union(S.boolean, S.undefined),
		}),
	),
);

export const codemodConfigSchema = S.union(
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('piranha'),
		language: S.literal('java'),
		arguments: S.union(argumentsSchema, S.undefined),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('jscodeshift'),
		arguments: S.union(argumentsSchema, S.undefined),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('ts-morph'),
		arguments: S.union(argumentsSchema, S.undefined),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('repomod-engine'),
		arguments: S.union(argumentsSchema, S.undefined),
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('recipe'),
		names: S.array(S.string),
		arguments: S.union(argumentsSchema, S.undefined),
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
