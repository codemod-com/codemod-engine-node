import { ChangeMessage, MessageKind } from './messages';

export const buildChangeMessage = (
	filePath: string,
	oldSource: string,
	newSource: string,
	caseTitle: string,
): ChangeMessage => {
	return {
		k: MessageKind.change,
		p: filePath,
		r: [0, oldSource.length],
		t: newSource,
		c: caseTitle,
	};
};
