import { nextJsNewLinkCodemod } from './cases/nextJsNewLink';
import {nextJsAddMissingReactImport} from "./cases/nextJsAddMissingReactImport"

export const codemods = [nextJsNewLinkCodemod,nextJsAddMissingReactImport];

export type CodemodId = typeof codemods[0]['id'];
