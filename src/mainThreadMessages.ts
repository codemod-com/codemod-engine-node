import * as S from '@effect/schema/Schema';
import { argumentRecordSchema } from './schemata/argumentRecordSchema.js';

const mainThreadMessageSchema = S.union(
	S.struct({
		kind: S.literal('exit'),
	}),
	S.struct({
		kind: S.literal('runCodemod'),
		path: S.string,
		data: S.string,
	}),
);

export type MainThreadMessage = S.To<typeof mainThreadMessageSchema>;

export const decodeMainThreadMessage = S.parseSync(mainThreadMessageSchema);

const workerDataSchema = S.struct({
	codemodPath: S.string,
	codemodSource: S.string,
	codemodEngine: S.union(S.literal('jscodeshift'), S.literal('ts-morph')),
	formatWithPrettier: S.boolean,
	safeArgumentRecord: S.tuple(argumentRecordSchema),
});

export type WorkerData = S.To<typeof workerDataSchema>;

export const decodeWorkerDataSchema = S.parseSync(workerDataSchema);
