import { diffChars } from 'diff';
import { CodemodId } from './codemods';
import { ChangeMessage, MessageKind } from './messages';

const isTextRelevant = (text: string): boolean => {
	return text.replace(/ /gm, '').replace(/\n/gm, '').length !== 0;
};

export const buildChangeMessages = (
	filePath: string,
	oldSource: string,
	newSource: string,
	codemodId: CodemodId,
): ReadonlyArray<ChangeMessage> => {
	const diffChanges = diffChars(oldSource, newSource);

	const changes: ChangeMessage[] = [];
	let leftCount = 0;

	for (const diffChange of diffChanges) {
		const count = diffChange.count ?? 0;

		if (diffChange.added && isTextRelevant(diffChange.value)) {
			const range: ChangeMessage['r'] = [leftCount, leftCount];

			changes.push({
				k: MessageKind.change,
				p: filePath,
				r: range,
				t: diffChange.value,
				c: codemodId,
			});
		} else if (diffChange.removed && isTextRelevant(diffChange.value)) {
			const range: ChangeMessage['r'] = [leftCount, leftCount + count];

			changes.push({
				k: MessageKind.change,
				p: filePath,
				r: range,
				t: diffChange.value,
				c: codemodId,
			});

			leftCount += count;
		} else {
			leftCount += count;
		}
	}

	return changes;
};
