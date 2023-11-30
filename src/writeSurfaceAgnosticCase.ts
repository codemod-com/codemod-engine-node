import { EventEmitter } from 'node:events';
import { parseSurfaceAgnosticCase } from './schemata/surfaceAgnosticCaseSchema.js';
import { createHash } from 'node:crypto';
import { parseSurfaceAgnosticJob } from './schemata/surfaceAgnosticJobSchema.js';
import { WriteStream } from 'node:fs';

const buildUint8Buffer = (value: number): Buffer => {
	if (value > 0xff - 1) {
		throw new Error('The passed value exceeds 0xFF - 1');
	}

	const buffer = Buffer.alloc(1);
	buffer.writeUint8(value & 0xff);

	return buffer;
};

const buildUint16Buffer = (value: number): Buffer => {
	if (value > 0xffff - 1) {
		throw new Error('The passed value exceeds 0xFFFF - 1');
	}

	const buffer = Buffer.alloc(2);

	buffer.writeUint16BE(value & 0xffff);

	return buffer;
};

const buildBigIntBuffer = (bi: bigint): Buffer => {
	const buffer = Buffer.alloc(8);
	buffer.writeBigInt64BE(bi);

	return buffer;
};

const buildStringBuffer = (str: string): Buffer => {
	const MAXIMUM_LENGTH = 0xffff - 1;

	const stringBuffer = Buffer.from(str);

	if (stringBuffer.byteLength > MAXIMUM_LENGTH) {
		throw new Error(
			`The string byte length is greater than ${MAXIMUM_LENGTH}`,
		);
	}

	const lengthBuffer = buildUint16Buffer(stringBuffer.byteLength);

	return Buffer.concat([lengthBuffer, stringBuffer]);
};

export const writeSurfaceAgnosticCase = (
	writable: WriteStream,
): EventEmitter => {
	const eventEmitter = new EventEmitter();
	let mode: 'AWAITING_PREAMBLE' | 'AWAITING_JOBS' | 'ENDED' =
		'AWAITING_PREAMBLE';

	const hashOfHashDigests = createHash('ripemd160');

	const preambleListener = (input: unknown) => {
		try {
			if (mode !== 'AWAITING_PREAMBLE' || !writable.writable) {
				return;
			}

			const kase = parseSurfaceAgnosticCase(input);

			const innerBuffer = Buffer.concat([
				Buffer.from(kase.caseHashDigest, 'base64url').subarray(0, 20),
				Buffer.from(kase.codemodHashDigest, 'base64url').subarray(
					0,
					20,
				),
				buildBigIntBuffer(kase.createdAt),
				buildStringBuffer(kase.absoluteTargetPath),
				buildStringBuffer(JSON.stringify(kase.argumentRecord)),
			]);

			const hashDigest = createHash('ripemd160')
				.update(innerBuffer)
				.digest();

			const outerBuffer = Buffer.concat([
				Buffer.from('INTC'),
				new Uint8Array([1, 0, 0, 0]), // v. 1.0.00,
				buildUint16Buffer(innerBuffer.byteLength),
				hashDigest,
				innerBuffer,
			]);

			writable.write(outerBuffer);

			hashOfHashDigests.update(hashDigest);

			mode = 'AWAITING_JOBS';
		} catch (error) {
			eventEmitter.emit('error', error);
		}
	};

	const jobListener = (input: unknown) => {
		try {
			if (mode !== 'AWAITING_JOBS' || !writable.writable) {
				return;
			}

			const job = parseSurfaceAgnosticJob(input);

			const innerBuffer = Buffer.concat([
				Buffer.from(job.jobHashDigest, 'base64url').subarray(0, 20),
				buildUint8Buffer(job.kind),
				buildStringBuffer(job.oldUri),
				buildStringBuffer(job.newUri),
			]);

			const hashDigest = createHash('ripemd160')
				.update(innerBuffer)
				.digest();

			const outerBuffer = Buffer.concat([
				Buffer.from('INTJ'),
				buildUint16Buffer(innerBuffer.byteLength),
				hashDigest,
				innerBuffer,
			]);

			writable.write(outerBuffer);

			hashOfHashDigests.update(hashDigest);
		} catch (error) {
			eventEmitter.emit('error', error);
		}
	};

	const postambleListener = () => {
		try {
			if (mode !== 'AWAITING_JOBS' || !writable.writable) {
				return;
			}

			mode = 'ENDED';

			writable.write(Buffer.from('INTE'));
			writable.write(hashOfHashDigests.digest());
			writable.close();

			writable.end();

			eventEmitter.removeListener('preamble', preambleListener);
			eventEmitter.removeListener('job', jobListener);
			eventEmitter.removeListener('postamble', postambleListener);

			// writers emit finish, readers emit end
			eventEmitter.emit('finish');
		} catch (error) {
			eventEmitter.emit('error', error);
		}
	};

	eventEmitter.addListener('preamble', preambleListener);
	eventEmitter.addListener('job', jobListener);
	eventEmitter.addListener('postamble', postambleListener);

	return eventEmitter;
};
