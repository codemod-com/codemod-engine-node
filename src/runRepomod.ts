import { Filemod, executeFilemod, CallbackService } from '@intuita-inc/filemod';
import { buildApi } from '@intuita-inc/filemod';
import { UnifiedFileSystem } from '@intuita-inc/filemod';
import { FileSystemManager } from '@intuita-inc/filemod';
import jscodeshift from 'jscodeshift';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';
import hastToBabelAst from '@svgr/hast-util-to-babel-ast';
import tsmorph from 'ts-morph';
import { FileCommand } from './fileCommands.js';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { mdxjs } from 'micromark-extension-mdxjs';
import { mdxFromMarkdown, mdxToMarkdown } from 'mdast-util-mdx';
import { visit } from 'unist-util-visit';
import { filter } from 'unist-util-filter';
import { IFs } from 'memfs';
import { SafeArgumentRecord } from './safeArgumentRecord.js';
import { createHash } from 'node:crypto';
import { Message } from './messages.js';

const parseMdx = (data: string) =>
	fromMarkdown(data, {
		extensions: [mdxjs()],
		mdastExtensions: [mdxFromMarkdown()],
	});

const stringifyMdx = (tree: Root) =>
	toMarkdown(tree, { extensions: [mdxToMarkdown()] });

type Root = ReturnType<typeof fromMarkdown>;

export type Dependencies = Readonly<{
	jscodeshift: typeof jscodeshift;
	unified: typeof unified;
	rehypeParse: typeof rehypeParse;
	hastToBabelAst: typeof hastToBabelAst;
	tsmorph: typeof tsmorph;
	parseMdx: typeof parseMdx;
	stringifyMdx: typeof stringifyMdx;
	filterMdxAst: typeof filter;
	visitMdxAst: typeof visit;
	unifiedFileSystem: UnifiedFileSystem;
}>;

export const runRepomod = async (
	fileSystem: IFs,
	filemod: Filemod<Dependencies, Record<string, unknown>>,
	inputPath: string,
	formatWithPrettier: boolean,
	safeArgumentRecord: SafeArgumentRecord,
	onPrinterMessage: (message: Message) => void,
): Promise<readonly FileCommand[]> => {
	const fileSystemManager = new FileSystemManager(
		// @ts-expect-error type inconsistency
		fileSystem.promises.readdir,
		fileSystem.promises.readFile,
		fileSystem.promises.stat,
	);
	const unifiedFileSystem = new UnifiedFileSystem(
		// @ts-expect-error type inconsistency
		fileSystem,
		fileSystemManager,
	);

	const api = buildApi<Dependencies>(unifiedFileSystem, () => ({
		jscodeshift,
		unified,
		rehypeParse,
		hastToBabelAst,
		tsmorph,
		parseMdx,
		stringifyMdx,
		visitMdxAst: visit,
		filterMdxAst: filter,
		unifiedFileSystem,
	}));

	const processedPathHashDigests = new Set<string>();

	const totalPathHashDigests = new Set<string>();

	for (const path of filemod.includePatterns ?? []) {
		totalPathHashDigests.add(
			createHash('ripemd160').update(path).digest('base64url'),
		);
	}

	const callbackService: CallbackService = {
		onCommandExecuted: (command) => {
			if (
				command.kind !== 'upsertData' &&
				command.kind !== 'deleteFile'
			) {
				return;
			}

			const hashDigest = createHash('ripemd160')
				.update(command.path)
				.digest('base64url');

			processedPathHashDigests.add(hashDigest);
			totalPathHashDigests.add(hashDigest);

			onPrinterMessage({
				kind: 'progress',
				processedFileNumber: processedPathHashDigests.size,
				totalFileNumber: totalPathHashDigests.size,
			});
		},
		onError: (path, message) => {
			onPrinterMessage({
				kind: 'error',
				path,
				message,
			});
		},
	};

	const externalFileCommands = await executeFilemod(
		api,
		filemod,
		inputPath,
		{
			...safeArgumentRecord[0],
		},
		callbackService,
	);

	return Promise.all(
		externalFileCommands.map(async (externalFileCommand) => {
			if (externalFileCommand.kind === 'upsertFile') {
				try {
					await fileSystem.promises.stat(externalFileCommand.path);

					return {
						kind: 'updateFile',
						oldPath: externalFileCommand.path,
						oldData: '', // TODO get the old data from the filemod
						newData: externalFileCommand.data,
						formatWithPrettier,
					};
				} catch (error) {
					return {
						kind: 'createFile',
						newPath: externalFileCommand.path,
						newData: externalFileCommand.data,
						formatWithPrettier,
					};
				}
			}

			return {
				kind: 'deleteFile',
				oldPath: externalFileCommand.path,
			};
		}),
	);
};
