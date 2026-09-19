/**
 * The active domain.
 *
 * This is the single switch that says which subject the app is teaching.
 * To run another subject, write its definition next to `it.ts` and re-point
 * this export. Nothing in the engine reads any other domain file.
 */
import { itDomain } from "./it";
import type { DomainDefinition } from "./types";

export const domain: DomainDefinition = itDomain;

export type { DomainDefinition } from "./types";
export { capitalise } from "./types";
