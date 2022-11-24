import { transformer } from "./transformer";

export const nextJsAddMissingReactImport = {
	id: 'nextJsAddMissingReactImport' as const,
	group: 'nextJs' as const,
	transformer,
};
