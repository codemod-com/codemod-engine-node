export const codemods = [
	{
		group: 'nextJs',
		caseTitle: 'Add Missing React Import',
		url: 'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/transforms/add-missing-react-import.ts',
		license:
			'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/license.md',
		withParser: 'tsx',
	},
	{
		group: 'nextJs',
		caseTitle: 'Name Default Component',
		url: 'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/transforms/name-default-component.ts',
		license:
			'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/license.md',
		withParser: 'tsx',
	},
];
