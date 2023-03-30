/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Repomod } from '@intuita-inc/repomod-engine-api/';
import type jscodeshift from 'jscodeshift';
import type rehypeParse from 'rehype-parse';
import type { unified } from 'unified';
import type hastToBabelAst from '@svgr/hast-util-to-babel-ast';

type Dependencies = Readonly<{
	jscodeshift: typeof jscodeshift;
	unified: typeof unified;
	rehypeParse: typeof rehypeParse;
	hastToBabelAst: typeof hastToBabelAst;
}>;

const entry_client_jsx_data = `
/// <reference types="vite/client" />
import { hydrateRoot, createRoot } from 'react-dom/client'

import App from './App'
import { Document } from './Document'
import { ServerContextProvider } from './entry-server'
/**
 * When \`#redwood-app\` isn't empty then it's very likely that you're using
 * prerendering. So React attaches event listeners to the existing markup
 * rather than replacing it.
 * https://reactjs.org/docs/react-dom-client.html#hydrateroot
 */
const redwoodAppElement = document.getElementById('redwood-app')

if (redwoodAppElement.children?.length > 0) {
  hydrateRoot(
    document,
    <ServerContextProvider value={window.__loadServerData?.()}>
      <Document css={window.__assetMap?.().css}>
        <App />
      </Document>
    </ServerContextProvider>
  )
} else {
  console.log('Rendering from scratch 🇦🇼🇦🇼')
  const root = createRoot(document)
  root.render(<App />)
}
`;

const repomod: Repomod<Dependencies> = {
	includePatterns: ['**/*.index.html'],
	excludePatterns: ['**/node_modules'],
	handleFile: async (api, path: string, options) => {
		if (api.getBasename(path) !== 'index.html') {
			return [];
		}

		const index_html_path = path;

		const dirname = api.getDirname(index_html_path);
		const document_tsx_path = api.joinPaths(dirname, 'Document.tsx');
		const entry_client_jsx_path = api.joinPaths(
			dirname,
			'entry-client.jsx',
		);

		const index_html_data = await api.readFile(path);

		if (!index_html_data.includes('redwood-app')) {
			return [];
		}

		return [
			{
				kind: 'deleteFile',
				path: index_html_path,
				options,
			},
			{
				kind: 'upsertFile',
				path: document_tsx_path,
				options: {
					...options,
					index_html_data,
				},
			},
			{
				kind: 'upsertFile',
				path: entry_client_jsx_path,
				options: {
					...options,
					entry_client_jsx_data,
				},
			},
		];
	},
	// this function might not be called at all
	handleData: async (api, path, __, options) => {
		if (path.endsWith('entry-client.jsx')) {
			return Promise.resolve({
				kind: 'upsertData',
				path,
				data: options['entry_client_jsx_data'] ?? '',
			});
		}

		const dependencies = api.getDependencies();

		const j = dependencies.jscodeshift;

		const index_html_data = options['index_html_data'] ?? '';

		const root = j.withParser('tsx')(`
import React from 'react';

interface DocumentProps {
	children: React.ReactNode;
	css: string[]; // array of css import strings
	meta?: string[];
}

export const Document = ({ children, css = [] }: DocumentProps) => {
	return '#TODO replace with index.html contents';
}
		`);

		const hast = dependencies
			.unified()
			.use(dependencies.rehypeParse)
			.parse(index_html_data);

		hast.children = hast.children.filter(
			(child) => child.type !== 'doctype',
		);

		// @ts-expect-error default import issues?
		const program = dependencies.hastToBabelAst(hast);

		const jsxRoot = dependencies.jscodeshift(program);

		jsxRoot
			.find(j.JSXElement, {
				type: 'JSXElement',
				openingElement: {
					type: 'JSXOpeningElement',
					name: {
						type: 'JSXIdentifier',
						name: 'div',
					},
					attributes: [
						{
							type: 'JSXAttribute',
							name: {
								// type: 'JSXIdentifier',
								name: 'id',
							},
							value: {
								// type: 'StringLiteral',
								value: 'redwood-app',
							},
						},
					],
				},
			})
			.replaceWith((node) => ({
				...node.value,
				children: [j.jsxExpressionContainer(j.identifier('children'))],
			}));

		jsxRoot
			.find(j.JSXElement, {
				type: 'JSXElement',
				openingElement: {
					type: 'JSXOpeningElement',
					name: {
						type: 'JSXIdentifier',
						name: 'head',
					},
				},
			})
			.forEach((path) => {
				const toInject = `
				{css.map((cssLinks, index) => {
					return (
						<link
							rel="stylesheet"
							key={\`css-\${index}\`}
							href={\`/\${cssLinks}\`}
						/>
					);
				})}
				`;

				const collection = j(path).find(j.JSXElement).paths();

				const p = collection[collection.length - 1];

				p?.insertAfter(toInject);
			});

		root.find(j.ReturnStatement).replaceWith((node) => {
			const [firstExpression] = program.body;

			if (
				!firstExpression ||
				firstExpression.type !== 'ExpressionStatement'
			) {
				return node;
			}

			return j.returnStatement(firstExpression.expression);
		});

		return Promise.resolve({
			kind: 'upsertData',
			path,
			data: root.toSource(),
		});
	},
};

export default repomod;
