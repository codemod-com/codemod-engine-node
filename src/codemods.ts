import { nextJsNewLinkCodemod } from "./cases/nextJsNewLink";

export const codemods = [
    nextJsNewLinkCodemod,
];

export type CodemodId = typeof codemods[0]['id']