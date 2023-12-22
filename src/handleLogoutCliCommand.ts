import { existsSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { PrinterBlueprint } from './printer.js';
import { revokeCLIToken } from './apis.js';

export const handleLogoutCliCommand = async (printer: PrinterBlueprint) => {
	const tokenTxtPath = join(homedir(), '.intuita', 'token.txt');

	if (!existsSync(tokenTxtPath)) {
		printer.printConsoleMessage('info', 'You are already logged out.');
		return;
	}

	try {
		const token = await readFile(tokenTxtPath, 'utf-8');
		await revokeCLIToken(token.trim());
	} catch (error) {
		// Don't inform user if something went wrong, just delete the token file.
	}

	await unlink(tokenTxtPath);
	printer.printConsoleMessage('info', 'You have successfully logged out.');
};
