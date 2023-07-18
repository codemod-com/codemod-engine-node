# codemod-engine-node

## Instalation

Use PNPM (instead of NPM and Yarn) to install the dependencies.

    pnpm install

## Global installation (linking)

Install the Codemod Engine Node as the global executable sourced from the project repository.

    pnpm link --global
    which intuita

## Global installation (registry)

Install the Codemod Engine Node as the global executable sourced from the NPM Registry https://www.npmjs.com/.

    pnpm add --global @intuita-inc/intuita # install using PNPM
    which intuita # test if the installation was successful
