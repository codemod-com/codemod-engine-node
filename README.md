# Intuita's Codemod Engine Node

Intuita gives you multiple ways to discover, run & share supported codemods and code automation recipes. With the command-line interface (CLI) you can interact with the Intuita platform using a terminal or through an automated system. Intuita's CLI requires Node.js v16+.

## Installation

    npm i intuita

## Global installation (recommended)

    npm i -g intuita

## Usage

### Running a codemod

    intuita [framework/version/codemod-name]

#### Example (running Next.js app router receipe codemod)

    intuita next/13/app-router-recipe

### List available codemods

The `list` command can be used to list all codemods available in the [Codemod Registry](https://github.com/intuita-inc/codemod-registry).

    intuita list

### Sync registry

The `syncRegistry` command can be used to sync local codemods with the public [Codemod Registry](https://github.com/intuita-inc/codemod-registry).

    intuita syncRegistry

### Generate codemod from file diff

The `learn` command can be used to send the diff of the latest edited file to Codemod Studio and have it automatically build an explainable and debuggable codemod.

After running this command, if any git diff exists, Intuita will use the diff as before/after snippets in [Codemod Studio](https://codemod.studio).

    intuita learn

### Options

- [`--include`](https://docs.intuita.io/docs/cli/advanced-usage#--include)
- [`--exclude`](https://docs.intuita.io/docs/cli/advanced-usage#--exclude)
- [`--targetPath`](https://docs.intuita.io/docs/cli/advanced-usage#--targetpath)
- [`--sourcePath`](https://docs.intuita.io/docs/cli/advanced-usage#--sourcepath)
- [`--codemodEngine`](https://docs.intuita.io/docs/cli/advanced-usage#--codemodengine)
- [`--fileLimit`](https://docs.intuita.io/docs/cli/advanced-usage#--filelimit)
- [`--usePrettier`](https://docs.intuita.io/docs/cli/advanced-usage#--useprettier)
- [`--useCache`](https://docs.intuita.io/docs/cli/advanced-usage#--usecache)
- [`--useJson`](https://docs.intuita.io/docs/cli/advanced-usage#--usejson)
- [`--threadCount`](https://docs.intuita.io/docs/cli/advanced-usage#--threadcount)
- [`--dryRun`](https://docs.intuita.io/docs/cli/advanced-usage#--dryrun)

## Contribution

We'd love for you to contribute to the [Codemod Engine](https://github.com/intuita-inc/codemod-engine-node) and the [Codemod Registry](https://github.com/intuita-inc/codemod-registry). Please note that once you create a pull request, you will be asked to sign our [Contributor License Agreement](https://cla-assistant.io/intuita-inc/codemod-registry).

We're always excited to support codemods for more frameworks and libraries. Contributing allows us to make codemods more accessible to more framework builders, developers, and more.
