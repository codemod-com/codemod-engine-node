import * as S from '@effect/schema/Schema';

export const runSettingsSchema = S.union(
	S.struct({
		dryRun: S.optional(S.literal(false)).withDefault(() => false),
	}),
	S.struct({
		dryRun: S.literal(true),
		outputDirectoryPath: S.string,
	}),
);

export type RunSettings = S.To<typeof runSettingsSchema>;
