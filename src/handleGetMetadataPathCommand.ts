import { homedir } from 'node:os';
import { downloadCodemod } from './downloadCodemod.js';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const handleGetMetadataPathCommand = async (name: string) => {
	await downloadCodemod(name);

	const hashDigest = createHash('ripemd160').update(name).digest('base64url');
	const codemodDirectoryPath = join(homedir(), '.intuita', hashDigest);

	console.log(codemodDirectoryPath);
};
