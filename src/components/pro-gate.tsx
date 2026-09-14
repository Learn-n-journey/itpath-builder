import { Link } from "@tanstack/react-router";
import { Check, Crown } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/state/auth-state";

interface ProFeature {
  /** Matches the `feature` prop passed by the gated page. */
  name: string;
  description: string;
}

/** Every Pro-gated feature. Order is the order shown on paywall screens. */
const PRO_FEATURES: ProFeature[] = [
  {
    name: "The AI Tutor",
    description: "Ask anything and get answers that know your weak areas.",
  },
  {
    name: "Second Brain",
    description: "Save notes, links and files; the AI connects them to your studies.",
  },
  {
    name: "Hands-on labs",
    description: "Guided, real-tool practice for every certification topic.",
  },
  {
    name: "The incident simulator",
    description: "Work realistic troubleshooting tickets like a help-desk pro.",
  },
  {
    name: "The command-line simulator",
    description: "Practice Windows, PowerShell, Linux and mobile shells safely.",
  },
  {
    name: "The exam simulator",
    description: "Full timed practice exams that mirror the real thing.",
  },
];

/**
 * Gates a Pro feature behind an active Pro subscription. Signed-in Pro users
 * see the children; everyone else sees an upgrade prompt that names the
 * current page's feature and lists every other Pro feature.
 */
export function ProGate({
  feature,
  children,
}: {
  /** Name of the gated feature — must match an entry in PRO_FEATURES. */
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

  const others = PRO_FEATURES.filter((entry) => entry.name !== feature);

  return (
    <div className="panel border-primary/30 p-6 sm:p-8">
      <div className="text-center">
        <Crown className="mx-auto size-8 text-primary" aria-hidden />
        <h2 className="mt-3 font-display text-lg font-semibold">
          {feature} is a Pro feature
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {userId
            ? "Upgrade to Pro to unlock this page — and everything else below."
            : "Create a free account and upgrade to Pro to unlock this page — and everything else below."}
        </p>
      </div>
      {others.length > 0 ? (
        <div className="mx-auto mt-6 max-w-md">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pro also includes
          </p>
          <ul className="mt-3 space-y-2.5">
            {others.map((entry) => (
              <li key={entry.name} className="flex items-start gap-2.5 text-left">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-sm">
                  <span className="font-medium">{entry.name.replace(/^The /, "")}</span>
                  <span className="text-muted-foreground"> — {entry.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
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
