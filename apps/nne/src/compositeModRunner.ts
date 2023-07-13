import { Codemod, runCodemod } from './codemodRunner.js';
import { Filemod, runFilemod } from './filemodRunner.js';
import { ModCommand } from './modCommands.js';

export type CompositeMod = Readonly<{
	engine: 'composite-mod-engine';
	caseTitle: string;
	mods: ReadonlyArray<Filemod | Codemod>;
}>;

type File = {
	path: string;
	oldData: string;
	newData: string;
	created: boolean;
	deleted: boolean;
	updated: boolean;
};

const handleModCommands = (
	_files: ReadonlyArray<File>,
	modCommands: ReadonlyArray<ModCommand>,
): ReadonlyArray<File> => {
	let files = _files.slice();

	for (const modCommand of modCommands) {
		if (modCommand.kind === 'createFile') {
			files.push({
				path: modCommand.newPath,
				oldData: '',
				newData: modCommand.newData,
				created: true,
				deleted: false,
				updated: false,
			});
		}

		if (modCommand.kind === 'copyFile') {
			const newData =
				files.find((file) => file.path === modCommand.oldPath)
					?.newData ?? '';

			files.push({
				path: modCommand.newPath,
				oldData: '',
				newData,
				created: true,
				deleted: false,
				updated: false,
			});
		}

		if (modCommand.kind === 'deleteFile') {
			files = files.map((file) => {
				return {
					...file,
					created: false,
					deleted:
						file.path === modCommand.oldPath ? true : file.deleted,
					updated: false,
				};
			});
		}

		if (modCommand.kind === 'moveFile') {
			const oldData =
				files.find((file) => file.path === modCommand.oldPath)
					?.oldData ?? '';

			files = files.map((file) => {
				return {
					...file,
					created: false,
					deleted:
						file.path === modCommand.oldPath ? true : file.deleted,
					updated: false,
				};
			});

			files.push({
				path: modCommand.newPath,
				oldData,
				newData: oldData,
				created: true,
				deleted: false,
				updated: false,
			});
		}

		if (modCommand.kind === 'updateFile') {
			files = files.map((file) => {
				const oldData =
					file.path === modCommand.oldPath
						? modCommand.oldData
						: file.oldData;

				const newData =
					file.path === modCommand.newData
						? modCommand.newData
						: file.newData;

				return {
					path: file.path,
					created: file.created,
					deleted: false,
					oldData,
					newData,
					updated:
						file.path === modCommand.oldPath ? true : file.updated,
				};
			});
		}
	}

	return files;
};

export const runCompositeMod = async (
	compositeMod: CompositeMod,
	path: string,
	data: string,
	formatWithPrettier: boolean,
): Promise<ModCommand[]> => {
	let files: File[] = [
		{
			path,
			oldData: data,
			newData: data,
			created: false,
			deleted: false,
			updated: false,
		},
	];

	for (const mod of compositeMod.mods) {
		if (mod.engine === 'filemod-engine') {
			const currentFiles = files.slice();

			for (const file of currentFiles) {
				if (file.deleted) {
					continue;
				}

				const modCommands = await runFilemod(mod, file.path);

				files = handleModCommands(files, modCommands).slice();
			}
		}

		if (mod.engine === 'jscodeshift' || mod.engine === 'ts-morph') {
			const currentFiles = files.slice();

			for (const file of currentFiles) {
				if (file.deleted) {
					continue;
				}

				const modCommands = runCodemod(
					mod,
					file.path,
					file.newData,
					formatWithPrettier,
				);

				files = handleModCommands(files, modCommands).slice();
			}
		}
	}

	const commands: ModCommand[] = [];

	for (const file of files) {
		if (file.deleted) {
			commands.push({
				kind: 'deleteFile',
				oldPath: file.path,
			});

			continue;
		}

		if (file.updated) {
			commands.push({
				kind: 'updateFile',
				oldData: '',
				oldPath: file.path,
				newData: file.newData,
				formatWithPrettier,
			});

			continue;
		}

		if (file.created) {
			commands.push({
				kind: 'createFile',
				newPath: file.path,
				newData: file.newData,
				formatWithPrettier,
			});
		}
	}

	return commands;
};
