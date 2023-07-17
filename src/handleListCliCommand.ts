import { createHash } from 'node:crypto';

type CodemodEntry = Readonly<{
	kind: 'codemod';
	engine: 'jscodeshift' | 'ts-morph' | 'repomod-engine';
	hashDigest: string;
	name: string;
	description: string;
}>;

export const handleListCliCommand = () => {
	const entries: CodemodEntry[] = [];

	// for (const codemod of nneCodemods) {
	// 	const hashDigest = createHash('ripemd160')
	// 		.update(codemod.caseTitle)
	// 		.digest('base64url');

	// 	entries.push({
	// 		kind: 'codemod',
	// 		engine: codemod.engine as CodemodEntry['engine'],
	// 		hashDigest,
	// 		name: codemod.caseTitle,
	// 		description:
	// 			'description' in codemod ? String(codemod.description) : '',
	// 	});
	// }

	// TODO: this for loop will be soon removed
	// for (const codemod of muiCodemods) {
	// 	const hashDigest = createHash('ripemd160')
	// 		.update(codemod.caseTitle)
	// 		.digest('base64url');

	// 	entries.push({
	// 		kind: 'codemod',
	// 		engine: 'jscodeshift',
	// 		hashDigest,
	// 		name: codemod.caseTitle,
	// 		description: '',
	// 	});
	// }

	// {
	// 	// TODO hack
	// 	const hashDigest = createHash('ripemd160')
	// 		.update('next/13/app-directory-boilerplate')
	// 		.digest('base64url');

	// 	entries.push({
	// 		kind: 'codemod',
	// 		engine: 'repomod-engine',
	// 		hashDigest,
	// 		name: 'next/13/app-directory-boilerplate',
	// 		description:
	// 			'This codemod provides boilerplate for the app directory.',
	// 	});
	// }

	// {
	// 	// TODO hack
	// 	const hashDigest = createHash('ripemd160')
	// 		.update('next/13/remove-next-export')
	// 		.digest('base64url');

	// 	entries.push({
	// 		kind: 'codemod',
	// 		engine: 'repomod-engine',
	// 		hashDigest,
	// 		name: 'next/13/remove-next-export',
	// 		description:
	// 			'This codemod removes all usages of the next export command.',
	// 	});
	// }

	// entries.sort((a, b) => a.name.localeCompare(b.name));

	// console.log(JSON.stringify(entries));
};