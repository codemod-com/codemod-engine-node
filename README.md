# Intuita's Codemod Engine Node

## Instalation

Use PNPM (instead of NPM and Yarn) to install the dependencies.

    pnpm install

## Global installation (linking)

Install the Codemod Engine Node as the global executable sourced from the project repository.

    pnpm link --global
    which intuita

## Global installation (registry)

Install the Codemod Engine Node as the global executable sourced from the NPM Registry https://www.npmjs.com/.

    pnpm i -g intuita # install globally using PNPM
    which intuita # test if the installation was successful

## Execution

This example shows how to execute a "next/13/app-router" codemod over the current working directory with PNPX:

    pnpx intuita --name next/13/app-router

If you have installed the executable, you can achieve the same with the following line:

    intuita --name next/13/app-router
