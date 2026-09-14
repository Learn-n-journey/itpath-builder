import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/state/auth-state";

/**
 * Gates a Pro feature behind an active Pro subscription. Signed-in Pro users
 * see the children; everyone else sees an upgrade prompt.
 */
export function ProGate({
  feature,
  children,
}: {
  /** Short name of the gated feature, shown in the upgrade prompt. */
  feature: string;
  children: ReactNode;
}) {
  const { userId, ready } = useAuth();
  const { isPro, loading } = useSubscription();

  if (!ready || loading) {
    return (
      <div className="panel p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (isPro) return <>{children}</>;

  return (
    <div className="panel border-primary/30 p-6 text-center sm:p-8">
      <Crown className="mx-auto size-8 text-primary" aria-hidden />
      <h2 className="mt-3 font-display text-lg font-semibold">
        {feature} is a Pro feature
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {userId
          ? "Upgrade once to unlock it forever — along with the AI Tutor, AI grading, labs and the incident simulator."
          : "Create a free account and upgrade once to unlock it forever — along with the AI Tutor, AI grading, labs and the incident simulator."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/pricing">See Pro plans</Link>
        </Button>
        {!userId ? (
          <Button asChild variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
