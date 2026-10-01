export const SIMULATOR_STATE_VERSION = 2;

function safeUserKey(userId: string | null | undefined): string {
  return userId && /^[A-Za-z0-9_-]+$/.test(userId) ? userId : "guest";
}

/** Account-scoped, versioned browser persistence for simulator state. */
export function simulatorStorageKey(name: string, userId?: string | null): string {
  return `itpath:${name}:${safeUserKey(userId)}:v${SIMULATOR_STATE_VERSION}`;
}

export function readSimulatorState<T>(
  name: string,
  userId: string | null | undefined,
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(simulatorStorageKey(name, userId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { version?: number; value?: T };
    return parsed.version === SIMULATOR_STATE_VERSION && parsed.value !== undefined
      ? parsed.value
      : fallback;
  } catch {
    return fallback;
  }
}

export function writeSimulatorState<T>(
  name: string,
  userId: string | null | undefined,
  value: T,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      simulatorStorageKey(name, userId),
      JSON.stringify({ version: SIMULATOR_STATE_VERSION, value }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearSimulatorState(name: string, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(simulatorStorageKey(name, userId));
  } catch {
    // Storage can be unavailable or full; reset still works in memory.
  }
}
