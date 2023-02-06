import {
	buildDeclarativeFilemod,
	buildDeclarativeTransform,
	buildFilePathTransformApi,
} from '@intuita-inc/filemod-engine';
import { DeleteMessage, MessageKind, MoveMessage } from './messages';

export type Filemod = Readonly<{
	engine: 'filemod-engine';
	caseTitle: string;
	group: string | null;
	transformer: string;
}>;

export const runFilemod = async (
	filemod: Filemod,
	filePath: string,
): Promise<ReadonlyArray<DeleteMessage | MoveMessage>> => {
	const messages: (DeleteMessage | MoveMessage)[] = [];

	const buffer = Buffer.from(filemod.transformer, 'base64url');

	// TODO verify if this works?
	const rootDirectoryPath = '/';

	const transformApi = buildFilePathTransformApi(rootDirectoryPath, filePath);

	const declarativeFilemod = await buildDeclarativeFilemod({
		buffer,
	});

	const declarativeTransform = buildDeclarativeTransform(declarativeFilemod);

	const commands = await declarativeTransform(
		rootDirectoryPath,
		transformApi,
	);

	for (const command of commands) {
		console.log(command);

		if (command.kind === 'delete') {
			const message: DeleteMessage = {
				k: MessageKind.delete,
				oldFilePath: command.path,
				modId: filemod.caseTitle,
			};

			messages.push(message);
		}

		if (command.kind === 'move') {
			const message: MoveMessage = {
				k: MessageKind.move,
				oldFilePath: command.fromPath,
				newFilePath: command.toPath,
				modId: filemod.caseTitle,
			};

			messages.push(message);
		}
	}

	return messages;
};
