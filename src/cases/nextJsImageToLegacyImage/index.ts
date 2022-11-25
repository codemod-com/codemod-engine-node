import { transformer } from './transformer';

export const nextJsImageToLegacyImage = {
	id: 'nextJsImageToLegacyImage' as const,
	group: 'nextJs' as const,
	transformer,
};
