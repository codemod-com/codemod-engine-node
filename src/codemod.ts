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

type Arguments = S.To<typeof argumentsSchema>;

const optionalArgumentsSchema = S.optional(argumentsSchema).withDefault(
	() => [],
);

export const PIRANHA_LANGUAGES = [
	'java',
	'kt',
	'go',
	'py',
	'swift',
	'ts',
	'tsx',
	'scala',
] as const;

const piranhaLanguageSchema = S.union(
	...PIRANHA_LANGUAGES.map((language) => S.literal(language)),
);

export const codemodConfigSchema = S.union(
	S.struct({
		schemaVersion: S.literal('1.0.0'),
		engine: S.literal('piranha'),
		language: piranhaLanguageSchema,
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
		engine: S.union(S.literal('repomod-engine'), S.literal('filemod')),
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
			arguments: Arguments;
	  }>
	| Readonly<{
			source: 'registry';
			name: string;
			engine: 'jscodeshift' | 'repomod-engine' | 'filemod' | 'ts-morph';
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
			engine: 'jscodeshift' | 'repomod-engine' | 'filemod' | 'ts-morph';
			indexPath: string;
	  }>;
