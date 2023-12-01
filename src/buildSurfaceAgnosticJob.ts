import { randomBytes } from 'crypto';
import {
	FormattedFileCommand,
	buildNewDataPathForCreateFileCommand,
	buildNewDataPathForUpdateFileCommand,
} from './fileCommands.js';
import {
	JOB_KIND,
	SurfaceAgnosticJob,
} from './schemata/surfaceAgnosticJobSchema.js';

export const buildSurfaceAgnosticJob = (
	outputDirectoryPath: string,
	command: FormattedFileCommand,
): SurfaceAgnosticJob => {
	const jobHashDigest = randomBytes(20).toString('base64url');

	if (command.kind === 'createFile') {
		const newUri = buildNewDataPathForCreateFileCommand(
			outputDirectoryPath,
			command,
		);

		return {
			kind: JOB_KIND.CREATE_FILE,
			jobHashDigest,
			oldUri: '',
			newUri,
		};
	}

	if (command.kind === 'copyFile') {
		return {
			kind: JOB_KIND.COPY_FILE,
			jobHashDigest,
			oldUri: command.oldPath,
			newUri: command.newPath,
		};
	}

	if (command.kind === 'deleteFile') {
		return {
			kind: JOB_KIND.DELETE_FILE,
			jobHashDigest,
			oldUri: command.oldPath,
			newUri: '',
		};
	}

	if (command.kind === 'moveFile') {
		return {
			kind: JOB_KIND.MOVE_FILE,
			jobHashDigest,
			oldUri: command.oldPath,
			newUri: command.newPath,
		};
	}

	const newUri = buildNewDataPathForUpdateFileCommand(
		outputDirectoryPath,
		command,
	);

	return {
		kind: JOB_KIND.REWRITE_FILE,
		jobHashDigest,
		oldUri: command.oldPath,
		newUri,
	};
};
