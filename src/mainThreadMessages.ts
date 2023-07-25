import * as S from '@effect/schema/Schema';

const mainThreadMessageSchema = S.union(
	S.struct({
		kind: S.literal('exit'),
	}),
	S.struct({
		kind: S.literal('recipe'),
		codemodFilePath: S.union(S.string, S.null),
		filePath: S.string,
		outputDirectoryPath: S.string,
		codemodHashDigests: S.array(S.string),
		executionId: S.string,
		formatWithPrettier: S.boolean,
	}),
);

export type MainThreadMessage = S.To<typeof mainThreadMessageSchema>;

export const decodeMainThreadMessage = S.parseSync(mainThreadMessageSchema);
