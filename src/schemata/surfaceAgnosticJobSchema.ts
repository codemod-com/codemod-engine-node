import * as S from '@effect/schema/Schema';

export const JOB_KIND_REWRITE_FILE = 1;
export const JOB_KIND_CREATE_FILE = 2;
export const JOB_KIND_DELETE_FILE = 3;
export const JOB_KIND_MOVE_FILE = 4;
export const JOB_KIND_MOVE_AND_REWRITE_FILE = 5;
export const JOB_KIND_COPY_FILE = 6;

const jobKindSchema = S.union(
	S.literal(JOB_KIND_REWRITE_FILE),
	S.literal(JOB_KIND_CREATE_FILE),
	S.literal(JOB_KIND_DELETE_FILE),
	S.literal(JOB_KIND_MOVE_FILE),
	S.literal(JOB_KIND_MOVE_AND_REWRITE_FILE),
	S.literal(JOB_KIND_COPY_FILE),
);

export const parseJobKind = S.parseSync(jobKindSchema);

const surfaceAgnosticJobSchema = S.struct({
	jobHashDigest: S.string,
	kind: jobKindSchema,
	oldUri: S.string,
	newUri: S.string,
});

export const parseSurfaceAgnosticJob = S.parseSync(surfaceAgnosticJobSchema);

export type SurfaceAgnosticJob = S.To<typeof surfaceAgnosticJobSchema>;
