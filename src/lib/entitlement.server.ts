/**
 * Server side plan check.
 *
 * The React paywall (ProGate) only hides the UI. Paid work that costs money,
 * such as every AI call, must confirm the caller's plan on the server before
 * it runs, otherwise a signed in free account can call the server function
 * directly and use the paid feature.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { domain } from "@/domain/active";

export type PlanTier = "free" | "plus" | "pro";

interface SubscriptionLike {
  product_id: string;
  status: string;
  current_period_end: string | null;
}

function grantsAccess(row: SubscriptionLike, now: Date): boolean {
  const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const periodActive = !periodEnd || periodEnd > now;
  if (
    (row.status === "active" || row.status === "trialing" || row.status === "past_due") &&
    periodActive
  ) {
    return true;
  }
  // A cancelled plan keeps access until the paid period runs out.
  return row.status === "canceled" && Boolean(periodEnd && periodEnd > now);
}

/** Reads the caller's plan from the database, as the caller, under RLS. */
export async function planTier(
  supabase: SupabaseClient<Database>,
  userId: string,
  email?: string | null,
): Promise<PlanTier> {
  if (email) {
    const { data: beta } = await supabase
      .from("beta_access")
      .select("email")
      .ilike("email", email)
      .maybeSingle();
    if (beta) return "pro";
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("product_id,status,current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const now = new Date();
  const rows = (data ?? []) as SubscriptionLike[];
  const active = rows.filter((row) => grantsAccess(row, now));
  if (active.length === 0) return "free";
  return active.some((row) => row.product_id !== "itpath_plus") ? "pro" : "plus";
}

function meets(tier: PlanTier, required: "plus" | "pro"): boolean {
  if (tier === "pro") return true;
  return required === "plus" && tier === "plus";
}

export interface EntitlementFailure {
  ok: false;
  error: string;
}

/**
 * Returns null when the caller's plan covers the feature, otherwise a ready
 * made failure reply the handler can return straight back.
 */
export async function requirePlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  claims: { email?: unknown } | undefined,
  required: "plus" | "pro",
  featureName: string,
): Promise<EntitlementFailure | null> {
  const email = typeof claims?.email === "string" ? claims.email : null;
  const tier = await planTier(supabase, userId, email);
  if (meets(tier, required)) return null;
  const planName = required === "plus" ? "Plus or Pro" : "Pro";
  return {
    ok: false,
    error: `${featureName} is part of ${domain.appName} ${planName}. Upgrade your plan to use it.`,
  };
}
