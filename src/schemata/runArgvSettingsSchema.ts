import * as S from '@effect/schema/Schema';

export const runArgvSettingsSchema = S.union(
	S.struct({
		dryRun: S.optional(S.literal(false)).withDefault(() => false),
	}),
	S.struct({
		dryRun: S.literal(true),
	}),
);
