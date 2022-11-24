import { nextJsNewLinkCodemod } from './cases/nextJsNewLink';
import {nextJsMissingReactCodemod} from "./cases/addMissingReactImport"

export const codemods = [nextJsNewLinkCodemod,nextJsMissingReactCodemod];

export type CodemodId = typeof codemods[0]['id'];
