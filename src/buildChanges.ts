import { diffChars } from "diff";

type Change = Readonly<{
    range: [number, number],
    text: string,
}>;

export const buildChanges = (
    oldSource: string,
    newSource: string,
): ReadonlyArray<Change> => {
    const diffChanges = diffChars(oldSource, newSource);

    const changes: Change[] = [];
    let leftCount = 0;

    for(const diffChange of diffChanges) {
        const count = diffChange.count ?? 0;

        if(diffChange.added) {
            const range: Change['range'] = [leftCount, leftCount];

            changes.push({
                range,
                text: diffChange.value,
            });
        } else if (diffChange.removed) {
            const range: Change['range'] = [leftCount, leftCount + count];

            changes.push({
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