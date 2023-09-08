import * as S from '@effect/schema/Schema';
import { argumentRecordSchema } from './argumentRecord.js';

const mainThreadMessageSchema = S.union(
	S.struct({
		kind: S.literal('exit'),
	}),
	S.struct({
		kind: S.literal('runCodemod'),
		codemodPath: S.string,
		codemodSource: S.string,
		codemodEngine: S.union(
			S.literal('jscodeshift'),
			S.literal('repomod-engine'),
			S.literal('ts-morph'),
		),
		path: S.string,
		data: S.string,
		formatWithPrettier: S.boolean,
		safeArgumentRecord: S.tuple(argumentRecordSchema),
	}),
);

export type MainThreadMessage = S.To<typeof mainThreadMessageSchema>;

export const decodeMainThreadMessage = S.parseSync(mainThreadMessageSchema);
