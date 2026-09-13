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

/**
 * Reads the signed-in user's purchases from the subscriptions table.
 * `isPro` is true while any row grants access (lifetime purchases never
 * expire; subscriptions follow their billing period).
 */
export function useSubscription() {
  const { userId, ready } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

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

    const channel = supabase
      .channel(`subscriptions-${userId}`)
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

  const isPro = subscription ? rowGrantsAccess(subscription) : false;
  return { subscription, isPro, loading: loading || !ready };
}
