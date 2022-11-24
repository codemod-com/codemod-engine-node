import { nextJsNewLinkCodemod } from './cases/nextJsNewLink';
import {nextJsMissingReactCodemod} from "./cases/addMissingReactImport";
import { nextImageExperimental } from './cases/nextImageExperimental';

export const codemods = [nextJsNewLinkCodemod,nextJsMissingReactCodemod,nextImageExperimental];

export type CodemodId = typeof codemods[0]['id'];
