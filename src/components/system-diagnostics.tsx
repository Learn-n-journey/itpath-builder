import { useRouter } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

import { navItems } from "@/config/navigation";
import { createDefaultUserData } from "@/lib/app-data/defaults";
import { loadState, saveState, STORAGE_KEY } from "@/lib/app-data/storage";
import { APP_DATA_VERSION } from "@/lib/app-data/types";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/state/app-state";

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

export function SystemDiagnostics() {
  const router = useRouter();
  const { user, hydrated, forceSave } = useAppState();
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [ranAt, setRanAt] = useState<string | null>(null);

  function run() {
    const results: Check[] = [];

    // 0. Data Initialization
    const defaultData = createDefaultUserData();
    const initOk = !!defaultData.createdAt && Array.isArray(defaultData.studySessions);
    results.push({
      name: "Data Initialization",
      pass: initOk,
      detail: "Internal default state generators are producing valid schemas.",
    });

    // 1. Application loads
    results.push({
      name: "Application loads",
      pass: typeof document !== "undefined" && !!document.getElementById("__diagnostics-anchor"),
      detail: "React tree is mounted and rendering in the browser.",
    });

    // 2. Navigation works
    const routePaths = new Set(Object.keys(router.routesByPath ?? {}));
    const missing = navItems.filter((i) => !routePaths.has(i.to)).map((i) => i.to);
    results.push({
      name: "Navigation works",
      pass: missing.length === 0 && routePaths.size > 1,
      detail:
        missing.length === 0
          ? `All ${navItems.length} navigation items resolve to a real route.`
          : `Missing routes: ${missing.join(", ")}`,
    });

    // 3. LocalStorage works
    let storageOk = false;
    let storageDetail = "LocalStorage is not available in this browser.";
    try {
      const probe = "__itpath_diag__";
      window.localStorage.setItem(probe, "ok");
      storageOk = window.localStorage.getItem(probe) === "ok";
      window.localStorage.removeItem(probe);
      storageDetail = storageOk
        ? "Wrote, read back and removed a test value."
        : "Value did not read back correctly.";
    } catch (e) {
      storageDetail = e instanceof Error ? e.message : storageDetail;
    }
    results.push({ name: "LocalStorage works", pass: storageOk, detail: storageDetail });

    // 4. State loads
    const loaded = loadState();
    const loadOk =
      hydrated && loaded.outcome !== "unavailable" && loaded.state.version === APP_DATA_VERSION;
    results.push({
      name: "State loads",
      pass: loadOk,
      detail: `Load outcome: ${loaded.outcome}, data version ${loaded.state.version}.`,
    });

    // 5. State saves
    const saved = forceSave() && saveState({ version: APP_DATA_VERSION, user });
    let roundTrip = false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      roundTrip = !!raw && JSON.parse(raw).version === APP_DATA_VERSION;
    } catch {
      roundTrip = false;
    }
    results.push({
      name: "State saves",
      pass: saved && roundTrip,
      detail: roundTrip
        ? "State was written to LocalStorage and read back successfully."
        : "State could not be written or read back.",
    });

    // 6. Settings save
    let settingsOk = false;
    let settingsDetail = "Could not verify settings persistence.";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      settingsOk =
        !!parsed?.user?.settings &&
        parsed.user.settings.studyHoursPerWeek === user.settings.studyHoursPerWeek &&
        parsed.user.settings.targetJob === user.settings.targetJob;
      settingsDetail = settingsOk
        ? `Saved settings match the live values (${user.settings.studyHoursPerWeek}h/week, ${user.settings.targetJob}).`
        : "Stored settings do not match the current values.";
    } catch (e) {
      settingsDetail = e instanceof Error ? e.message : settingsDetail;
    }
    results.push({ name: "Settings save", pass: settingsOk, detail: settingsDetail });

    // 7. Version & Schema
    const raw = window.localStorage.getItem(STORAGE_KEY);
    let schemaOk = false;
    let schemaDetail = "No data found in storage.";
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const hasVersion = parsed.version === APP_DATA_VERSION;
        const hasUser = !!parsed.user && typeof parsed.user === "object";
        schemaOk = hasVersion && hasUser;
        schemaDetail = `Version: ${parsed.version} (${hasVersion ? "Current" : "Legacy"}), User Object: ${hasUser ? "OK" : "Missing"}`;
      } catch (e) {
        schemaDetail = "Failed to parse storage data.";
      }
    }
    results.push({ name: "Version & Schema", pass: schemaOk, detail: schemaDetail });

    setChecks(results);
    setRanAt(new Date().toLocaleTimeString());
  }

  const passCount = checks?.filter((c) => c.pass).length ?? 0;

  return (
    <div id="__diagnostics-anchor">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} variant="secondary">
          Run diagnostics
        </Button>
        {checks ? (
          <p className="text-sm text-muted-foreground">
            {passCount}/{checks.length} passed at {ranAt}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No tests have been run yet.</p>
        )}
      </div>

      {checks ? (
        <ul className="mt-4 divide-y divide-border">
          {checks.map((c) => (
            <li key={c.name} className="flex items-start gap-3 py-3">
              {c.pass ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              )}
              <div>
                <p className="text-sm font-medium">
                  {c.name} —{" "}
                  <span className={c.pass ? "text-success" : "text-destructive"}>
                    {c.pass ? "PASS" : "FAIL"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
