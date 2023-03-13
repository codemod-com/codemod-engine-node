import * as S from '@effect/schema';

const mainThreadMessageSchema = S.union(
	S.struct({
		kind: S.literal('exit'),
	}),
	S.struct({
		kind: S.literal('recipe'),
		codemodFilePath: S.option(S.string),
		filePath: S.string,
		newGroups: S.array(S.any),
		outputDirectoryPath: S.string,
	}),
);

export type MainThreadMessage = S.Infer<typeof mainThreadMessageSchema>;

export const decodeMainThreadMessage = S.decodeOrThrow(mainThreadMessageSchema);
