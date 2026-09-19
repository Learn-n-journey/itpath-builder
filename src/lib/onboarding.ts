/**
 * First-launch onboarding state. Kept on the device only: it decides whether a
 * learner still needs the guided tour and the quick setup panel in Settings.
 */
const TOUR_KEY = "itpath.onboarding.tour.v1";
const SETUP_KEY = "itpath.onboarding.setup.v1";

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
  return read(TOUR_KEY) === "done";
}

export function markTourSeen() {
  write(TOUR_KEY, "done");
}

export function restartTour() {
  try {
    localStorage.removeItem(TOUR_KEY);
  } catch {
    /* storage unavailable */
  }
  write(SETUP_KEY, "pending");
}

export function setupPending(): boolean {
  return read(SETUP_KEY) === "pending";
}

export function markSetupPending() {
  write(SETUP_KEY, "pending");
}

export function markSetupDone() {
  write(SETUP_KEY, "done");
}
