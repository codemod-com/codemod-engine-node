import { nextJsNewLinkCodemod } from './cases/nextJsNewLink';
import { nextJsAddMissingReactImport } from './cases/nextJsAddMissingReactImport';
import { nextImageExperimental } from './cases/nextJsImageExperimental';
import { nextJsImageToLegacyImage } from './cases/nextJsImageToLegacyImage';

export const codemods = [
	nextJsNewLinkCodemod,
	nextJsAddMissingReactImport,
	nextImageExperimental,
	nextJsImageToLegacyImage
];

export type CodemodId = typeof codemods[0]['id'];
