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

export class Runner {
	public constructor(
		protected readonly _fs: IFs,
		protected readonly _printer: PrinterBlueprint,
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
					(message) => this._printer.log(message),
					safeArgumentRecord,
					this._currentWorkingDirectory,
				);
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
							(message) => this._printer.log(message),
							safeArgumentRecord,
							this._currentWorkingDirectory,
						);
					}
				}

				return;
			}

			if (this._name !== null) {
				this._printer.info(
					'Executing the "%s" codemod against "%s"',
					this._name,
					this._flowSettings.targetPath,
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
					(message) => this._printer.log(message),
					safeArgumentRecord,
					this._currentWorkingDirectory,
				);
			}
		} catch (error) {
			if (!(error instanceof Error)) {
				return;
			}

			this._printer.log({ kind: 'error', message: error.message });
		}
	}

	protected async _handleCommand(
		command: FormattedFileCommand,
	): Promise<void> {
		await modifyFileSystemUponCommand(this._fs, this._runSettings, command);

		const printerMessage = buildPrinterMessageUponCommand(
			this._runSettings,
			command,
		);

		if (printerMessage) {
			this._printer.log(printerMessage);
		}
	}
}
