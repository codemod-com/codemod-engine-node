import { CodemodId } from './codemods';
import { ChangeMessage, MessageKind } from './messages';

export const buildChangeMessage = (
	filePath: string,
	oldSource: string,
	newSource: string,
	codemodId: CodemodId,
): ChangeMessage | null => {
	if (oldSource === newSource) {
		return null;
	}

	return {
		k: MessageKind.change,
		p: filePath,
		r: [0, oldSource.length],
		t: newSource,
		c: codemodId,
	};
};
