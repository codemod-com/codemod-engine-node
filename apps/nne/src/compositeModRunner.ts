import { Codemod, runCodemod } from './codemodRunner';
import { Filemod, runFilemod } from './filemodRunner';
import { MessageKind } from './messages';

export type CompositeMod = Readonly<{
	engine: 'composite-mod-engine';
	caseTitle: string;
	group: string | null;
	mods: ReadonlyArray<Filemod | Codemod>;
}>;

export const runCompositeMod = async (
	compositeMod: CompositeMod,
	filePath: string,
) => {
	const filePaths: string[] = [filePath];

	for (const mod of compositeMod.mods) {
		if (mod.engine === 'filemod-engine') {
			for (const filePath of filePaths) {
				const messages = await runFilemod(mod, filePath);

				for (const message of messages) {
					if (message.k === MessageKind.delete) {
						message.oldFilePath;
					}
				}
			}
		}

		if (mod.engine === 'jscodeshift') {
			for (const filePath of filePaths) {
				// const messages = await runCodemod();
			}
		}
	}
};
