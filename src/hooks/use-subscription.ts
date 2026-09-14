import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { useAuth } from "@/state/auth-state";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
  created_at: string;
}

function rowGrantsAccess(row: SubscriptionRow, now = new Date()): boolean {
  const periodEnd = row.current_period_end
    ? new Date(row.current_period_end)
    : null;
  const periodActive = !periodEnd || periodEnd > now;
  if ((row.status === "active" || row.status === "trialing" || row.status === "past_due") && periodActive) {
    return true;
  }
  // Cancelled subscriptions keep access until the end of the paid period.
  if (row.status === "canceled" && periodEnd && periodEnd > now) {
    return true;
  }
  return false;
}

export type PlanTier = "free" | "plus" | "pro";

/** Plus unlocks the non-AI Pro features; Pro unlocks everything. */
function tierForRow(row: SubscriptionRow): Exclude<PlanTier, "free"> {
  return row.product_id === "itpath_plus" ? "plus" : "pro";
}

/**
 * Reads the signed-in user's purchases from the subscriptions table.
 * `tier` is "pro" while any full-Pro row grants access, "plus" for a Plus
 * row, otherwise "free" (subscriptions follow their billing period; one-time
 * purchases are recorded as active without an end). Beta access counts as Pro.
 * `isPro` = full Pro, `isPlus` = Plus or Pro.
 */
export function useSubscription() {
  const { userId, email, ready } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [betaAccess, setBetaAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Beta / creator access: an email on the beta list unlocks Pro without paying.
  useEffect(() => {
    if (!ready || !userId || !email) {
      setBetaAccess(false);
      return;
    }
    let active = true;
    void supabase
      .from("beta_access")
      .select("email")
      .ilike("email", email)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setBetaAccess(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [userId, email, ready]);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("environment", getPaddleEnvironment())
        .order("created_at", { ascending: false })
        .limit(10);
      if (!active) return;
      const rows = (data ?? []) as SubscriptionRow[];
      setSubscription(rows.find((row) => rowGrantsAccess(row)) ?? rows[0] ?? null);
      setLoading(false);
    };
    void load();

    // Several Pro-aware controls can mount on the same page. Realtime channel
    // names must be unique or a later hook can reuse an already-subscribed
    // channel and throw while registering its callback.
    const channel = supabase
      .channel(`subscriptions-${userId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${userId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, ready]);

  const paid = subscription ? rowGrantsAccess(subscription) : false;
  const tier: PlanTier = betaAccess
    ? "pro"
    : paid && subscription
      ? tierForRow(subscription)
      : "free";
  const isPro = tier === "pro";
  const isPlus = tier !== "free";
  return { subscription, tier, isPro, isPlus, paid, betaAccess, loading: loading || !ready };
}
