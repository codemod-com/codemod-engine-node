import * as S from '@effect/schema';

const workerThreadMessageSchema = S.union(
	S.struct({
		kind: S.literal('message'),
		message: S.any,
	}),
	S.struct({
		kind: S.literal('idleness'),
	}),
);

export type WorkerThreadMessage = S.Infer<typeof workerThreadMessageSchema>;

export const decodeWorkerThreadMessage = S.decodeOrThrow(
	workerThreadMessageSchema,
);
