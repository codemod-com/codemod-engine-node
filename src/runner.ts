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
import type { RunSettings } from './schemata/runSettingsSchema.js';
import { TelemetryBlueprint } from './telemetryService.js';
import { randomBytes } from 'crypto';

type Stats = {
	id: string;
	filesModified: number;
};

export const buildRunStatsId = (): string =>
	randomBytes(20).toString('base64url');

export class Runner {
	private __stats: Stats | null = null;

	public constructor(
		protected readonly _fs: IFs,
		protected readonly _printer: PrinterBlueprint,
		protected readonly _telemetry: TelemetryBlueprint,
		protected readonly _codemodDownloader: CodemodDownloaderBlueprint,
		protected readonly _loadRepositoryConfiguration: () => Promise<RepositoryConfiguration>,
		protected readonly _codemodSettings: CodemodSettings,
		protected readonly _flowSettings: FlowSettings,
		protected readonly _runSettings: RunSettings,
		protected readonly _argumentRecord: ArgumentRecord,
		protected readonly _name: string | null,
		protected readonly _currentWorkingDirectory: string,
	) {}

	public async run() {
		try {
			this.__stats = {
				filesModified: 0,
				id: buildRunStatsId(),
			};

			if (
				'sourcePath' in this._codemodSettings &&
				'codemodEngine' in this._codemodSettings
			) {
				const codemod = {
					source: 'fileSystem' as const,
					engine: this._codemodSettings.codemodEngine,
					indexPath: this._codemodSettings.sourcePath,
				};

				const safeArgumentRecord = buildSafeArgumentRecord(
					codemod,
					this._argumentRecord,
				);

				await runCodemod(
					this._fs,
					this._printer,
					codemod,
					this._flowSettings,
					this._runSettings,
					(command) => this._handleCommand(command),
					(message) => this._printer.printMessage(message),
					safeArgumentRecord,
					this._currentWorkingDirectory,
				);

				this._telemetry.sendEvent({
					kind: 'codemodExecuted',
					codemodName: 'Codemod from FS',
					executionId: this.__stats.id,
					fileCount: this.__stats.filesModified,
				});

				return;
			}

			if (this._codemodSettings._.includes('runOnPreCommit')) {
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
							this._runSettings,
							(command) => this._handleCommand(command),
							(message) => this._printer.printMessage(message),
							safeArgumentRecord,
							this._currentWorkingDirectory,
						);

						this._telemetry.sendEvent({
							kind: 'codemodExecuted',
							codemodName: codemod.name,
							executionId: this.__stats.id,
							fileCount: this.__stats.filesModified,
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
					this._runSettings,
					(command) => this._handleCommand(command),
					(message) => this._printer.printMessage(message),
					safeArgumentRecord,
					this._currentWorkingDirectory,
				);

				this._telemetry.sendEvent({
					kind: 'codemodExecuted',
					codemodName: codemod.name,
					executionId: this.__stats.id,
					fileCount: this.__stats.filesModified,
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
		await modifyFileSystemUponCommand(this._fs, this._runSettings, command);

		if (!this._runSettings.dryRun && this.__stats !== null) {
			this.__stats.filesModified++;
		}

		const printerMessage = buildPrinterMessageUponCommand(
			this._runSettings,
			command,
		);

		if (printerMessage) {
			this._printer.printOperationMessage(printerMessage);
		}
	}
}
