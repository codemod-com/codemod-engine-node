export const codemods = [
	{
		group: 'nextJs',
		caseTitle: 'Next.js: add missing React import',
		url: 'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/transforms/add-missing-react-import.ts',
		license:
			'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/license.md',
		withParser: 'tsx',
	},
	{
		group: 'nextJs',
		caseTitle: 'Next.js: name default component',
		url: 'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/transforms/name-default-component.ts',
		license:
			'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/license.md',
		withParser: 'tsx',
	},
	{
		group: 'nextJs',
		caseTitle: 'Next.js: New Link',
		url: 'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/transforms/new-link.ts',
		license:
			'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/license.md',
		withParser: 'tsx',
	},
	{
		group: 'nextJs',
		caseTitle: 'Next.js: Next Image Experimental',
		url: 'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/transforms/next-image-experimental.ts',
		license:
			'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/license.md',
		withParser: 'tsx',
	},
	{
		group: 'nextJs',
		caseTitle: 'Next.js: Next Image to legacy Image',
		url: 'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/transforms/next-image-to-legacy-image.ts',
		license:
			'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/license.md',
		withParser: 'tsx',
	},
	{
		group: 'nextJs',
		caseTitle: 'Next.js: URL to WithRouter',
		url: 'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/transforms/url-to-withrouter.ts',
		license:
			'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next-codemod/license.md',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv4',
		caseTitle: 'React Router v4: Add Exact Prop',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/transforms/add-exact-prop/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group:'reactrouterv4',
		caseTitle: 'React Router v4: Create Hash History',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/transforms/create-hash-history/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv4',
		caseTitle: 'React Router v4: Hash Router',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/transforms/hash-router/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv4',
		caseTitle: 'React Router v4: Index Route',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/transforms/index-route/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv4',
		caseTitle: 'React Router v4: Remove with Props',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/transforms/remove-with-props/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv4',
		caseTitle: 'React Router v4: Rename Imports',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/transforms/rename-imports/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv4',
		caseTitle: 'React Router v4: Wrap with Switch',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/transforms/wrap-with-switch/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v4-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Compat Route',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/compat-route/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Compat Router',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/compat-router/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Link to Props',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/link-to-props/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Match Path Arguments',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/match-path-arguments/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: NavLink Exact End',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/navlink-exact-end/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Redirect to Navigate',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/redirect-to-navigate/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Remove Active Classname',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/remove-active-classname/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Remove Active Style',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/remove-active-style/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Remove Compat Router',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/remove-compat-router/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Remove Go Hooks',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/remove-go-hooks/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Remove Redirect Inside Switch',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/remove-redirect-inside-switch/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Rename Compat Imports',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/rename-compat-imports/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Static Router Imports',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/static-router-imports/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Use Location',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/use-location/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Use Navigate',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/use-navigate/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Use Params',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/use-params/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
	{
		group: 'reactrouterv6',
		caseTitle: 'React Router v6: Use Route Match',
		url: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/transforms/use-route-match/index.js',
		license: 'https://raw.githubusercontent.com/rajasegar/react-router-v6-codemods/main/LICENSE',
		withParser: 'tsx',
	},
];
