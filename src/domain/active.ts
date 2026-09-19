/**
 * The active domain.
 *
 * The app reads the subject from the registry rather than importing one by
 * name, so switching subject is a registry change and nothing else. Keep
 * importing `domain` from here; that has not changed.
 */
import { activeEntry, ACTIVE_PACKAGE } from "./registry";
import type { DomainDefinition } from "./types";

const entry = activeEntry();

export const domain: DomainDefinition = entry.definition;

/** Which package version the app is running, for logs and the about page. */
export const activeDomainKey = ACTIVE_PACKAGE;
export const activeDomainManifest = entry.manifest;

export type { DomainDefinition } from "./types";
export { capitalise } from "./types";
