/**
 * The IT and cybersecurity package, version 1.
 *
 * Only the manifest and the definition live here, because the registry is read
 * by the browser and must stay light. The full package (concepts, skills,
 * questions, assessments, sources, rules) is assembled on demand by
 * `src/content/packs/it-package.ts`, which QA and the pipeline load.
 */
import { itDomain } from "../it";
import { packageKey } from "../package";
import type { DomainManifest } from "../package";

export const itManifest: DomainManifest = {
  id: itDomain.id,
  version: "1.0.0",
  key: packageKey(itDomain.id, "1.0.0"),
  name: itDomain.appName,
  producedBy: "authored",
  producedAt: "2026-01-01T00:00:00.000Z",
  status: "active",
  scope: {
    qualifications: 0,
    sections: 0,
    concepts: 0,
    skills: 0,
    questions: 0,
    assessments: 0,
    sources: 0,
  },
};

export { itDomain };
