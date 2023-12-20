import type { PrinterBlueprint } from './printer.js';
import { openURL } from './utils.js';

const ACCESS_TOKEN_REQUESTED_BY_CLI_KEY = 'accessTokenRequestedByCLI';

export const handleLoginCliCommand = async (printer: PrinterBlueprint) => {
	printer.printConsoleMessage(
		'info',
		'Opening the Codemod Studio... Please Sign in with Github.',
	);
	const success = openURL(
		`https://codemod.studio/${ACCESS_TOKEN_REQUESTED_BY_CLI_KEY}`,
	);
	if (!success) {
		printer.printOperationMessage({
			kind: 'error',
			message:
				'Unexpected error occurred while opening the Codemod Studio.',
		});
		return;
	}
};
