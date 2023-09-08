import * as S from '@effect/schema/Schema';

const argumentsSchema = S.array(
	S.union(
		S.struct({
			name: S.string,
			kind: S.literal('string'),
			default: S.optional(S.string),
		}),
		S.struct({
			name: S.string,
			kind: S.literal('number'),
			default: S.optional(S.number),
		}),
		S.struct({
			name: S.string,
			kind: S.literal('boolean'),
			default: S.optional(S.boolean),
		}),
	),
);

const optionalArgumentsSchema = S.optional(argumentsSchema).withDefault(
	() => [],
);

export const codemodConfigSchema = S.union(
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('piranha'),
		language: S.literal('java'),
		arguments: optionalArgumentsSchema,
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('jscodeshift'),
		arguments: optionalArgumentsSchema,
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('ts-morph'),
		arguments: optionalArgumentsSchema,
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('repomod-engine'),
		arguments: optionalArgumentsSchema,
	}),
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('recipe'),
		names: S.array(S.string),
		arguments: optionalArgumentsSchema,
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
