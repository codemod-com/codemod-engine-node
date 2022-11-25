import { MessageKind, RewriteMessage } from './messages';

export const buildRewriteMessage = (
	inputFilePath: string,
	outputFilePath: string,
	caseTitle: string,
): RewriteMessage | null => {
	return {
		k: MessageKind.rewrite,
		i: inputFilePath,
		o: outputFilePath,
		c: caseTitle,
	};
};
