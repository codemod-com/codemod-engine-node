import { Codemod, runCodemod } from './codemodRunner';
import { Filemod, runFilemod } from './filemodRunner';
import { ModCommand } from './modCommands';

export type CompositeMod = Readonly<{
	engine: 'composite-mod-engine';
	caseTitle: string;
	group: string | null;
	mods: ReadonlyArray<Filemod | Codemod>;
}>;

type File = {
	path: string;
	data: string;
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
				data: modCommand.newData,
				created: true,
				deleted: false,
				updated: false,
			});
		}

		if (modCommand.kind === 'copyFile') {
			files.push({
				path: modCommand.newPath,
				data:
					files.find((file) => file.path === modCommand.oldPath)
						?.data ?? '',
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
				files.find((file) => file.path === modCommand.oldPath)?.data ??
				'';

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
				data: oldData,
				created: true,
				deleted: false,
				updated: false,
			});
		}

		if (modCommand.kind === 'updateFile') {
			files = files.map((file) => {
				return {
					path: file.path,
					created: file.created,
					deleted: false,
					data:
						file.path === modCommand.oldPath
							? modCommand.newData
							: file.data,
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
): Promise<ModCommand[]> => {
	let files: File[] = [
		{
			path,
			data,
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

		if (mod.engine === 'jscodeshift') {
			const currentFiles = files.slice();

			for (const file of currentFiles) {
				if (file.deleted) {
					continue;
				}

				const modCommand = await runCodemod(file.path, file.data, mod);

				files = handleModCommands(files, modCommand).slice();
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
				oldPath: file.path,
				newData: file.data,
			});

			continue;
		}

		if (file.created) {
			commands.push({
				kind: 'createFile',
				newPath: file.path,
				newData: file.data,
			});
		}
	}

	return commands;
};
