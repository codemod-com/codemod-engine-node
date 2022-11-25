import { nextJsNewLinkCodemod } from './cases/nextJsNewLink';
import { nextJsAddMissingReactImport } from './cases/nextJsAddMissingReactImport';
import { nextJsImageToLegacyImage } from './cases/nextJsImageToLegacyImage';
import { nextJsImageExperimental } from './cases/nextJsImageExperimental';


export const codemods = [
	nextJsNewLinkCodemod,
	nextJsAddMissingReactImport,
	nextJsImageToLegacyImage,
	nextJsImageExperimental
];

export type CodemodId = typeof codemods[0]['id'];
