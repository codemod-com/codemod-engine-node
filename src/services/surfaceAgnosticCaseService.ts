import { IFs } from 'memfs';
import { EventEmitter } from 'stream';
import { writeSurfaceAgnosticCase } from '../writeSurfaceAgnosticCase.js';
import { join } from 'path';
import { randomBytes } from 'node:crypto';
import { RunSettings } from '../runSettings.js';
import { SurfaceAgnosticCase } from '../schemata/surfaceAgnosticCaseSchema.js';
import { FlowSettings } from '../schemata/flowSettingsSchema.js';
import { ArgumentRecord } from '../schemata/argumentRecordSchema.js';
import { buildSurfaceAgnosticJob } from '../buildSurfaceAgnosticJob.js';
import { FormattedFileCommand } from '../fileCommands.js';

export class SurfaceAgnosticCaseService {
	private __eventEmitter: EventEmitter | null = null;

	public constructor(
		private readonly _fs: IFs,
		private readonly _runSettings: RunSettings,
		private readonly _flowSettings: FlowSettings,
		private readonly _argumentRecord: ArgumentRecord,
		private readonly _caseHashDigest: Buffer,
	) {}

	public async emitPreamble(): Promise<void> {
		if (!this._runSettings.dryRun) {
			return;
		}

		await this._fs.promises.mkdir(this._runSettings.outputDirectoryPath, {
			recursive: true,
		});

		const writeStream = this._fs.createWriteStream(
			join(this._runSettings.outputDirectoryPath, 'case.data'),
		);

		this.__eventEmitter = writeSurfaceAgnosticCase(writeStream);

		const surfaceAgnosticCase: SurfaceAgnosticCase = {
			caseHashDigest: this._caseHashDigest.toString('base64url'),
			codemodHashDigest: randomBytes(20).toString('base64url'),
			createdAt: BigInt(Date.now()),
			absoluteTargetPath: this._flowSettings.targetPath,
			argumentRecord: this._argumentRecord,
		};

		this.__eventEmitter.emit('preamble', surfaceAgnosticCase);
	}

	public emitJob(command: FormattedFileCommand): void {
		if (!this._runSettings.dryRun) {
			return;
		}

		const job = buildSurfaceAgnosticJob(
			this._runSettings.outputDirectoryPath,
			command,
		);

		this.__eventEmitter?.emit('job', job);
	}

	public emitPostamble(): void {
		this.__eventEmitter?.emit('postamble');
	}
}
