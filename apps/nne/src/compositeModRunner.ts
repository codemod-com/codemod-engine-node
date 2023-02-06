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

	const handleModCommands = (modCommands: ReadonlyArray<ModCommand>) => {
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

			if (modCommand.kind === 'deleteFile') {
				files = files.map((file) => {
					return {
						...file,
						deleted: file.path === modCommand.oldPath,
					};
				});
			}

			if (modCommand.kind === 'moveFile') {
				const oldData =
					files.find((file) => file.path === modCommand.oldPath)
						?.data ?? '';

				files = files.map((file) => {
					return {
						...file,
						deleted: file.path === modCommand.oldPath,
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
						...file,
						data:
							file.path === modCommand.oldPath
								? modCommand.newData
								: file.data,
						updated:
							file.path === modCommand.oldPath
								? true
								: file.updated,
					};
				});
			}
		}
	};

	for (const mod of compositeMod.mods) {
		if (mod.engine === 'filemod-engine') {
			for (const file of files) {
				const modCommands = await runFilemod(mod, file.path);

				handleModCommands(modCommands);
			}
		}

		if (mod.engine === 'jscodeshift') {
			for (const file of files) {
				const modCommand = await runCodemod(file.path, file.data, mod);

				handleModCommands(modCommand);
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
