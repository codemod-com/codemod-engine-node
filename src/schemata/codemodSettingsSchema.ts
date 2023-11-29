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
	}),
	S.struct({
		source: S.string,
		codemodEngine: codemodEngineSchema,
	}),
	S.struct({
		sourcePath: S.string,
		codemodEngine: codemodEngineSchema,
	}),
);

export type CodemodSettings =
	| Readonly<{
			kind: 'runOnPreCommit';
	  }>
	| Readonly<{
			kind: 'runSourced';
			sourcePath: string;
			codemodEngine: S.To<typeof codemodEngineSchema>;
	  }>;

export const parseCodemodSettings = (
	input: unknown,
): CodemodSettings | null => {
	const codemodSettings = S.parseSync(codemodSettingsSchema)(input);

	if (!('_' in codemodSettings)) {
		return {
			kind: 'runSourced',
			sourcePath:
				'source' in codemodSettings
					? codemodSettings.source
					: codemodSettings.sourcePath,
			codemodEngine: codemodSettings.codemodEngine,
		};
	}

	if (codemodSettings._.includes('runOnPreCommit')) {
		return {
			kind: 'runOnPreCommit',
		};
	}

	return null;
};
