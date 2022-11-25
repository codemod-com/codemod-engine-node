import { transformer } from './transformer';

export const nextJsNewLinkCodemod = {
	id: 'nextJsNewLink' as const,
	group: 'nextJs' as const,
	transformer,
};
