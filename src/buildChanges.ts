import { diffChars } from "diff";

type Change = Readonly<{
    filePath: string,
    range: [number, number],
    text: string,
}>;

const isTextRelevant = (text: string): boolean => {
    return text.replace(/ /gm, "")
        .replace(/\n/gm, "")
        .length !== 0;
}

export const buildChanges = (
    filePath: string,
    oldSource: string,
    newSource: string,
): ReadonlyArray<Change> => {
    const diffChanges = diffChars(oldSource, newSource);

    const changes: Change[] = [];
    let leftCount = 0;

    for(const diffChange of diffChanges) {
        const count = diffChange.count ?? 0;

        if(diffChange.added && isTextRelevant(diffChange.value)) {
            const range: Change['range'] = [leftCount, leftCount];

            changes.push({
                filePath,
                range,
                text: diffChange.value,
            });
        } else if (diffChange.removed && isTextRelevant(diffChange.value)) {
            const range: Change['range'] = [leftCount, leftCount + count];

            changes.push({
                filePath,
                range,
                text: diffChange.value,
            });

            leftCount += count;
        } else {
            leftCount += count;
        }
    }

    return changes;
}