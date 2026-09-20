/**
 * Maintenance screen state, read straight from the database by anyone.
 * Owner-only writes go through `setMaintenance` in maintenance.functions.ts.
 */
import { supabase } from "@/integrations/supabase/client";

export type MaintenanceState = Record<string, boolean>;

/** Reads the on/off flag for every course. Never throws. */
export async function loadMaintenanceState(): Promise<MaintenanceState> {
  try {
    const { data, error } = await supabase.from("course_maintenance").select("domain, enabled");
    if (error || !data) return {};
    const state: MaintenanceState = {};
    for (const row of data) state[row.domain] = row.enabled;
    return state;
  } catch {
    return {};
  }
}
