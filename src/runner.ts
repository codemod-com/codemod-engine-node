import { randomBytes } from 'crypto';
import type { ArgumentRecord } from './schemata/argumentRecordSchema.js';
import {
	modifyFileSystemUponCommand,
	type FormattedFileCommand,
	buildPrinterMessageUponCommand,
} from './fileCommands.js';
import type { PrinterBlueprint } from './printer.js';
import { runCodemod } from './runCodemod.js';

import { buildSafeArgumentRecord } from './safeArgumentRecord.js';
import type { IFs } from 'memfs';
import type { CodemodDownloaderBlueprint } from './downloadCodemod.js';
import type { RepositoryConfiguration } from './repositoryConfiguration.js';
import type { CodemodSettings } from './schemata/codemodSettingsSchema.js';
import type { FlowSettings } from './schemata/flowSettingsSchema.js';
import type { TelemetryBlueprint } from './telemetryService.js';
import { buildSourcedCodemodOptions } from './buildCodemodOptions.js';
import { RunSettings } from './runSettings.js';
import { join } from 'path';

export class Runner {
	private __caseHashDigest: Buffer;
	private __modifiedFileCount: number;
	private __runSettings: RunSettings;

	public constructor(
		protected readonly _fs: IFs,
		protected readonly _printer: PrinterBlueprint,
		protected readonly _telemetry: TelemetryBlueprint,
		protected readonly _codemodDownloader: CodemodDownloaderBlueprint,
		protected readonly _loadRepositoryConfiguration: () => Promise<RepositoryConfiguration>,
		protected readonly _codemodSettings: CodemodSettings,
		protected readonly _flowSettings: FlowSettings,
		protected readonly _dryRun: boolean,
		protected readonly _argumentRecord: ArgumentRecord,
		protected readonly _name: string | null,
		protected readonly _currentWorkingDirectory: string,
		homeDirectoryPath: string,
	) {
		this.__caseHashDigest = randomBytes(20);
		this.__modifiedFileCount = 0;

		this.__runSettings = _dryRun
			? {
					dryRun: true,
					outputDirectoryPath: join(
						homeDirectoryPath,
						'cases',
						this.__caseHashDigest.toString('base64url'),
					),
			  }
			: {
					dryRun: false,
			  };
	}

	public async run() {
		try {
			if (this._codemodSettings.kind === 'runSourced') {
				const codemodOptions = await buildSourcedCodemodOptions(
					this._fs,
					this._codemodSettings,
				);

				const safeArgumentRecord = buildSafeArgumentRecord(
					codemodOptions,
					this._argumentRecord,
				);

				await runCodemod(
					this._fs,
					this._printer,
					codemodOptions,
					this._flowSettings,
					this.__runSettings,
					(command) => this._handleCommand(command),
					(message) => this._printer.printMessage(message),
					safeArgumentRecord,
					this._currentWorkingDirectory,
				);

				this._telemetry.sendEvent({
					kind: 'codemodExecuted',
					codemodName: 'Codemod from FS',
					executionId: this.__caseHashDigest.toString('base64url'),
					fileCount: this.__modifiedFileCount,
				});

				return;
			}

			if (this._codemodSettings.kind === 'runOnPreCommit') {
				const { preCommitCodemods } =
					await this._loadRepositoryConfiguration();

				for (const preCommitCodemod of preCommitCodemods) {
					if (preCommitCodemod.source === 'registry') {
						const codemod = await this._codemodDownloader.download(
							preCommitCodemod.name,
							this._flowSettings.useCache,
						);

						const safeArgumentRecord = buildSafeArgumentRecord(
							codemod,
							preCommitCodemod.arguments,
						);

						await runCodemod(
							this._fs,
							this._printer,
							codemod,
							this._flowSettings,
							this.__runSettings,
							(command) => this._handleCommand(command),
							(message) => this._printer.printMessage(message),
							safeArgumentRecord,
							this._currentWorkingDirectory,
						);

						this._telemetry.sendEvent({
							kind: 'codemodExecuted',
							codemodName: codemod.name,
							executionId:
								this.__caseHashDigest.toString('base64url'),
							fileCount: this.__modifiedFileCount,
						});
					}
				}

				return;
			}

			if (this._name !== null) {
				this._printer.printConsoleMessage(
					'info',
					`Executing the "${this._name}" codemod against "${this._flowSettings.targetPath}"`,
				);

				const codemod = await this._codemodDownloader.download(
					this._name,
					this._flowSettings.useCache,
				);

				const safeArgumentRecord = buildSafeArgumentRecord(
					codemod,
					this._argumentRecord,
				);

				await runCodemod(
					this._fs,
					this._printer,
					codemod,
					this._flowSettings,
					this.__runSettings,
					(command) => this._handleCommand(command),
					(message) => this._printer.printMessage(message),
					safeArgumentRecord,
					this._currentWorkingDirectory,
				);

				this._telemetry.sendEvent({
					kind: 'codemodExecuted',
					codemodName: codemod.name,
					executionId: this.__caseHashDigest.toString('base64url'),
					fileCount: this.__modifiedFileCount,
				});
			}
		} catch (error) {
			if (!(error instanceof Error)) {
				return;
			}

			this._printer.printOperationMessage({
				kind: 'error',
				message: error.message,
			});
			this._telemetry.sendEvent({
				kind: 'failedToExecuteCommand',
				commandName: 'intuita.executeCodemod',
			});
		}
	}

	protected async _handleCommand(
		command: FormattedFileCommand,
	): Promise<void> {
		await modifyFileSystemUponCommand(
			this._fs,
			this.__runSettings,
			command,
		);

		if (!this.__runSettings.dryRun) {
			++this.__modifiedFileCount;
		}

		const printerMessage = buildPrinterMessageUponCommand(
			this.__runSettings,
			command,
		);

		if (printerMessage) {
			this._printer.printOperationMessage(printerMessage);
		}
	}
}
