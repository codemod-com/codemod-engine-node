import * as S from '@effect/schema';

const mainThreadMessageSchema = S.union(
	S.struct({
		kind: S.literal('exit'),
	}),
	S.struct({
		kind: S.literal('recipe'),
		codemodFilePath: S.union(S.string, S.null),
		filePath: S.string,
		newGroups: S.array(S.string),
		outputDirectoryPath: S.string,
		codemodHashDigests: S.array(S.string),
		executionId: S.string,
	}),
);

export type MainThreadMessage = S.Infer<typeof mainThreadMessageSchema>;

export const decodeMainThreadMessage = S.decodeOrThrow(mainThreadMessageSchema);
