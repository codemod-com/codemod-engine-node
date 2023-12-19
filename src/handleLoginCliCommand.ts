import terminalLink from 'terminal-link';
import type { PrinterBlueprint } from './printer.js';

const ACCESS_TOKEN_REQUESTED_BY_CLI_KEY = 'accessTokenRequestedByCLI';

export const handleLoginCliCommand = async (printer: PrinterBlueprint) => {
	const EXTENSION_LINK = terminalLink(
		'Click to view the live results of this run in the Intuita VSCode Extension!',
		`https://codemod.studio/${ACCESS_TOKEN_REQUESTED_BY_CLI_KEY}`,
	);

	printer.printConsoleMessage('log', EXTENSION_LINK);
};
