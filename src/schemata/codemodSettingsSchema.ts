import * as S from '@effect/schema/Schema';

const codemodEngineSchema = S.union(
	S.literal('jscodeshift'),
	S.literal('repomod-engine'),
	S.literal('filemod'),
	S.literal('ts-morph'),
);

export const codemodSettingsSchema = S.union(
	S.struct({
		_: S.array(S.string),
		source: S.optional(S.string),
		sourcePath: S.optional(S.string),
		codemodEngine: S.optional(codemodEngineSchema),
	}),
);

export type CodemodSettings =
	| Readonly<{
			kind: 'runOnPreCommit';
	  }>
	| Readonly<{
			kind: 'runNamed';
			name: string;
	  }>
	| Readonly<{
			kind: 'runSourced';
			sourcePath: string;
			codemodEngine: S.To<typeof codemodEngineSchema> | null;
	  }>;

export const parseCodemodSettings = (input: unknown): CodemodSettings => {
	const codemodSettings = S.parseSync(codemodSettingsSchema)(input);

	if (codemodSettings._.includes('runOnPreCommit')) {
		return {
			kind: 'runOnPreCommit',
		};
	}

	const codemodName = codemodSettings._.at(-1);
	if (codemodName) {
		return {
			kind: 'runNamed',
			name: codemodName,
		};
	}

	const sourcePath =
		'source' in codemodSettings
			? codemodSettings.source
			: codemodSettings.sourcePath;

	if (!sourcePath) {
		throw new Error('sourcePath is not present');
	}

	return {
		kind: 'runSourced',
		sourcePath,
		codemodEngine: codemodSettings.codemodEngine ?? null,
	};
};
