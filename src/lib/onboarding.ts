/**
 * First-launch onboarding state. Kept on the device only: it decides whether a
 * learner still needs the guided tour and the quick setup panel in Settings.
 */
import { activeDomainKey } from "@/domain/active";

const LEGACY_TOUR_KEY = "itpath.onboarding.tour.v1";
const LEGACY_SETUP_KEY = "itpath.onboarding.setup.v1";

function subjectId(): string {
  return activeDomainKey.split("@")[0] ?? "it-cybersecurity";
}

function tourKey(): string {
  return `itpath.onboarding.${subjectId()}.tour.v2`;
}

function setupKey(): string {
  return `itpath.onboarding.${subjectId()}.setup.v2`;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export function tourSeen(): boolean {
  const current = read(tourKey());
  if (current === "done") return true;
  return subjectId() === "it-cybersecurity" && read(LEGACY_TOUR_KEY) === "done";
}

export function markTourSeen() {
  write(tourKey(), "done");
}

export function restartTour() {
  try {
    localStorage.removeItem(tourKey());
    if (subjectId() === "it-cybersecurity") localStorage.removeItem(LEGACY_TOUR_KEY);
  } catch {
    /* storage unavailable */
  }
  write(setupKey(), "pending");
}

export function setupPending(): boolean {
  const current = read(setupKey());
  if (current === "pending") return true;
  return subjectId() === "it-cybersecurity" && read(LEGACY_SETUP_KEY) === "pending";
}

export function markSetupPending() {
  write(setupKey(), "pending");
}

export function markSetupDone() {
  write(setupKey(), "done");
  if (subjectId() === "it-cybersecurity") write(LEGACY_SETUP_KEY, "done");
}
