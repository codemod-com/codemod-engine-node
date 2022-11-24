import { CodemodId } from './codemods';
import { MessageKind, RewriteMessage } from './messages';

export const buildRewriteMessage = (
	inputFilePath: string,
	outputFilePath: string,
	codemodId: CodemodId,
): RewriteMessage | null => {
	return {
		k: MessageKind.rewrite,
		i: inputFilePath,
		o: outputFilePath,
		c: codemodId,
	};
};
