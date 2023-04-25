import { codemods as nneCodemods } from '@nne/codemods';
import { codemods as muiCodemods } from '@nne/mui-codemods';
import { createHash } from 'node:crypto';

type CodemodEntry = Readonly<{
	kind: 'codemod';
	hashDigest: string;
	name: string;
	description: string;
}>;

export const handleListCliCommand = () => {
	const entries: CodemodEntry[] = [];

	for (const codemod of nneCodemods) {
		const hashDigest = createHash('ripemd160')
			.update(codemod.caseTitle)
			.digest('base64url');

		entries.push({
			kind: 'codemod',
			hashDigest,
			name: codemod.caseTitle,
			description:
				'description' in codemod ? String(codemod.description) : '',
		});
	}

	// TODO: this for loop will be soon removed
	for (const codemod of muiCodemods) {
		const hashDigest = createHash('ripemd160')
			.update(codemod.caseTitle)
			.digest('base64url');

		entries.push({
			kind: 'codemod',
			hashDigest,
			name: codemod.caseTitle,
			description: '',
		});
	}

	console.log(JSON.stringify(entries));
};
