import { nextJsNewLinkCodemod } from './cases/nextJsNewLink';
import { nextJsAddMissingReactImport } from './cases/nextJsAddMissingReactImport';
import { nextImageExperimental } from './cases/nextImageExperimental';

export const codemods = [
	nextJsNewLinkCodemod,
	nextJsAddMissingReactImport,
	nextImageExperimental,
];

export type CodemodId = typeof codemods[0]['id'];
