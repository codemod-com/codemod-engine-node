import * as S from '@effect/schema/Schema';

export const codemodSettingsSchema = S.union(
	S.struct({
		_: S.array(S.string),
	}),
	S.struct({
		sourcePath: S.string,
		codemodEngine: S.union(
			S.literal('jscodeshift'),
			S.literal('repomod-engine'),
			S.literal('filemod'),
			S.literal('ts-morph'),
		),
	}),
);

export type CodemodSettings = S.To<typeof codemodSettingsSchema>;
