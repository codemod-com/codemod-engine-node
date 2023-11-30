import { writeSurfaceAgnosticCase } from '../src/writeSurfaceAgnosticCase.js';
import {
	SurfaceAgnosticCase,
	parseSurfaceAgnosticCase,
} from '../src/schemata/surfaceAgnosticCaseSchema.js';
import { randomBytes } from 'node:crypto';
import {
	JOB_KIND_CREATE_FILE,
	JOB_KIND_REWRITE_FILE,
	SurfaceAgnosticJob,
	parseSurfaceAgnosticJob,
} from '../src/schemata/surfaceAgnosticJobSchema.js';

import {
	ReadStream,
	WriteStream,
	createReadStream,
	createWriteStream,
	mkdtempSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';
import { readSurfaceAgnosticCase } from '../src/readSurfaceAgnosticCase.js';
import assert, { deepStrictEqual } from 'node:assert';

const doWithinTemporaryDirectory = async <T>(
	prefix: string,
	callback: (temporaryDirectory: string) => Promise<T>,
): Promise<T> => {
	const temporaryDirectory = mkdtempSync(join(tmpdir(), prefix));

	try {
		return await callback(temporaryDirectory);
	} finally {
		try {
			await rm(temporaryDirectory, { recursive: true });
		} catch (e) {
			console.error(e);
		}
	}
};

const caseHashDigest = randomBytes(20);
const codemodHashDigest = randomBytes(20);

const kase: SurfaceAgnosticCase = {
	caseHashDigest: caseHashDigest.toString('base64url'),
	codemodHashDigest: codemodHashDigest.toString('base64url'),
	createdAt: BigInt(Date.now()),
	absoluteTargetPath: '/a/b/c',
	argumentRecord: {
		a: '1',
		b: 2,
		c: false,
	},
};

const rewriteJob: SurfaceAgnosticJob = {
	jobHashDigest: randomBytes(20).toString('base64url'),
	kind: JOB_KIND_REWRITE_FILE,
	oldUri: '/a/b/c/d.txt',
	newUri: '/a/b/c/e.txt',
};

const createJob: SurfaceAgnosticJob = {
	jobHashDigest: randomBytes(20).toString('base64url'),
	kind: JOB_KIND_CREATE_FILE,
	oldUri: '',
	newUri: '/a/b/c/f.txt',
};

const writerCallback = async (writable: WriteStream) => {
	const eventEmitter = writeSurfaceAgnosticCase(writable);

	return new Promise<void>((resolve, reject) => {
		eventEmitter.once('error', (error: unknown) => {
			reject(error);
		});
		eventEmitter.once('finish', () => {
			resolve();
		});

		eventEmitter.emit('preamble', kase);
		eventEmitter.emit('job', rewriteJob);
		eventEmitter.emit('job', createJob);
		eventEmitter.emit('postamble');
	});
};

type CaseWithJobs = Readonly<{
	kase: SurfaceAgnosticCase | null;
	jobs: ReadonlyArray<SurfaceAgnosticJob>;
}>;

const readerCallback = async (
	readStream: ReadStream,
): Promise<CaseWithJobs> => {
	const eventEmitter = readSurfaceAgnosticCase(readStream);

	let kase: SurfaceAgnosticCase | null = null;
	const jobs: SurfaceAgnosticJob[] = [];

	eventEmitter.on('case', (data) => {
		kase = parseSurfaceAgnosticCase(data);
	});

	eventEmitter.on('job', (data) => {
		const job = parseSurfaceAgnosticJob(data);

		jobs.push(job);
	});

	return new Promise<CaseWithJobs>((resolve, reject) => {
		eventEmitter.once('error', (error: unknown) => {
			reject(error);
		});
		eventEmitter.once('end', () => {
			resolve({
				kase,
				jobs,
			});
		});
	});
};

describe('surfaceAgnosticCase', () => {
	it('should write and read the case and jobs', async () => {
		const [caseWithJobs] = await doWithinTemporaryDirectory(
			'surfaceAgnosticCase',
			async (temporaryDirectory: string) => {
				const path = join(temporaryDirectory, 'a.data');

				const writeStream = createWriteStream(path, {
					start: 0,
					flags: 'w+',
				});

				await new Promise<void>((resolve) => {
					writeStream.once('open', () => {
						resolve();
					});
				});

				const readStream = createReadStream(path, { start: 0 });

				await new Promise<void>((resolve) => {
					readStream.once('open', () => {
						resolve();
					});
				});

				return Promise.allSettled([
					readerCallback(readStream),
					writerCallback(writeStream),
				]);
			},
		);

		assert(caseWithJobs.status === 'fulfilled');

		deepStrictEqual(caseWithJobs.value.kase, kase);
		deepStrictEqual(caseWithJobs.value.jobs[0], rewriteJob);
		deepStrictEqual(caseWithJobs.value.jobs[1], createJob);
	});
});
