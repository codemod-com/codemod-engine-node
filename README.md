# nora-node-engine

## Instalation

Use PNPM (instead of NPM and Yarn) to install the dependencies.

    pnpm install

## Compilation

Check if the project has has compile-time errors

    pnpm tsc --noemit

## Building

Use Vercel's NCC to transpile all the project's TS files and their dependencies into one JS file.

    pnpm build

## Packaging

Package the built JS file and Node toolchain into executable files

    pnpm package
