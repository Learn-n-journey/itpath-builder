/**
 * Activation and rollback.
 *
 * A package only goes live when every blocking check has passed: the package
 * audit, the draft audit that produced it, and the project's regression tests.
 * Activation is a single edited line in the registry plus an entry in the
 * activation log, so putting a subject back is the same operation in reverse
 * and the history of what was live, when, and on what evidence, is on disk.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const REGISTRY = "src/domain/registry.ts";
const LOG = ".quality/domain-activations.json";

export interface ActivationRecord {
  at: string;
  key: string;
  previousKey: string | null;
  action: "activate" | "rollback";
  evidence: { blocking: number; warnings: number; testsPassed: boolean };
  note: string;
}

export function readActivationLog(): ActivationRecord[] {
  if (!existsSync(LOG)) return [];
  return JSON.parse(readFileSync(LOG, "utf8")) as ActivationRecord[];
}

function writeLog(records: ActivationRecord[]): void {
  mkdirSync(".quality", { recursive: true });
  writeFileSync(LOG, `${JSON.stringify(records.slice(-200), null, 2)}\n`);
}

/** The key the registry currently points at. */
export function currentActiveKey(): string {
  const source = readFileSync(REGISTRY, "utf8");
  const match = source.match(/export const ACTIVE_PACKAGE = "([^"]+)"/);
  if (!match) throw new Error("Could not read ACTIVE_PACKAGE from the registry.");
  return match[1]!;
}

/** Is this key registered in the registry file? */
export function isRegistered(key: string): boolean {
  return readFileSync(REGISTRY, "utf8").includes(key);
}

function setActiveKey(key: string): void {
  const source = readFileSync(REGISTRY, "utf8");
  const replaced = source.replace(
    /export const ACTIVE_PACKAGE = [^;]+;/,
    `export const ACTIVE_PACKAGE = "${key}";`,
  );
  if (replaced === source) throw new Error("Could not rewrite ACTIVE_PACKAGE.");
  writeFileSync(REGISTRY, replaced);
}

export interface ActivationRequest {
  key: string;
  blocking: number;
  warnings: number;
  testsPassed: boolean;
  action?: "activate" | "rollback";
  note?: string;
}

export interface ActivationResult {
  activated: boolean;
  reason: string;
  previousKey: string;
}

/** Activate a package, but only when nothing blocking is outstanding. */
export function activatePackage(request: ActivationRequest): ActivationResult {
  const previousKey = currentActiveKey();

  if (!isRegistered(request.key)) {
    return { activated: false, reason: `${request.key} is not registered in ${REGISTRY}.`, previousKey };
  }
  if (request.blocking > 0) {
    return { activated: false, reason: `${request.blocking} blocking findings are still open.`, previousKey };
  }
  if (!request.testsPassed) {
    return { activated: false, reason: "The regression tests did not pass.", previousKey };
  }

  setActiveKey(request.key);
  writeLog([
    ...readActivationLog(),
    {
      at: new Date().toISOString(),
      key: request.key,
      previousKey,
      action: request.action ?? "activate",
      evidence: { blocking: request.blocking, warnings: request.warnings, testsPassed: request.testsPassed },
      note: request.note ?? "",
    },
  ]);

  return { activated: true, reason: `Active subject is now ${request.key}.`, previousKey };
}

/** Put the previous subject back. Always allowed: reversing is never risky. */
export function rollback(): ActivationResult {
  const log = readActivationLog();
  const last = [...log].reverse().find((record) => record.previousKey);
  const previousKey = currentActiveKey();

  if (!last?.previousKey) {
    return { activated: false, reason: "There is nothing to roll back to.", previousKey };
  }

  setActiveKey(last.previousKey);
  writeLog([
    ...log,
    {
      at: new Date().toISOString(),
      key: last.previousKey,
      previousKey,
      action: "rollback",
      evidence: { blocking: 0, warnings: 0, testsPassed: true },
      note: `Rolled back from ${previousKey}.`,
    },
  ]);

  return { activated: true, reason: `Rolled back to ${last.previousKey}.`, previousKey };
}
