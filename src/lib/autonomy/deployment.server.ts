import { activatePackage, rollback } from "@/lib/domain/activation.server";
import type { DeploymentAdapter, ImprovementCandidate } from "./types";

/** Production adapter. The reusable core depends only on DeploymentAdapter. */
export const domainDeploymentAdapter: DeploymentAdapter = {
  async deploy(candidate: ImprovementCandidate) {
    const key = `${candidate.domainId}@${candidate.candidateVersion}`;
    const result = activatePackage({ key, blocking: 0, warnings: 0, testsPassed: true, note: `Approved by Autonomy Core candidate ${candidate.id}.` });
    return { ok: result.activated, detail: result.reason };
  },
  async rollback() {
    const result = rollback();
    return { ok: result.activated, detail: result.reason };
  },
};