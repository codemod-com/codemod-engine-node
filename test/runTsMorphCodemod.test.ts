import { deepStrictEqual } from 'node:assert';
import { transpile } from '../src/getTransformer.js';
import { runTsMorphCodemod } from '../src/runTsMorphCodemod.js';

const codemodSource = transpile(`
import { SourceFile, EmitHint } from 'ts-morph';

export const handleSourceFile = (
    sourceFile: SourceFile,
): string | undefined => {
    sourceFile.addClass({
        name: 'Test'
    })

    return sourceFile.print({ emitHint: EmitHint.SourceFile });
};
`);

describe('runTsMorphCodemod', () => {
	it('should return transformed output', () => {
		const fileCommands = runTsMorphCodemod(
			codemodSource,
			'index.ts',
			``,
			true,
		);

		deepStrictEqual(fileCommands.length, 1);

		const [fileCommand] = fileCommands;

		deepStrictEqual(fileCommand, {
			kind: 'updateFile',
			oldPath: 'index.ts',
			oldData: '',
			newData: 'class Test {\n}\n',
			formatWithPrettier: true,
		});
	});
});
