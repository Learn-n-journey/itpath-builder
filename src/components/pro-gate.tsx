import { Link } from "@tanstack/react-router";
import { Check, Crown } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/state/auth-state";

interface ProFeature {
  /** Matches the `feature` prop passed by the gated page. */
  name: string;
  /** Shorter, natural name shown in headings and lists. */
  shortName: string;
  description: string;
  /** Minimum plan that unlocks this feature. "plus" = Plus or Pro; "pro" = Pro only. */
  tier: "plus" | "pro";
}

/** Every paid feature. Order is the order shown on paywall screens. */
const PRO_FEATURES: ProFeature[] = [
  {
    name: "The adaptive learning engine",
    shortName: "Adaptive learning",
    description:
      "A live model of what you know that picks your next best topic, difficulty and review timing.",
    tier: "plus",
  },
  {
    name: "The AI Tutor",
    shortName: "AI Tutor",
    description: "Ask any IT or cybersecurity question and get clear explanations, step-by-step walkthroughs, and study guidance.",
    tier: "pro",
  },
  {
    name: "AI grading and feedback",
    shortName: "AI grading and feedback",
    description: "Get detailed feedback on written answers, not just a right-or-wrong score.",
    tier: "pro",
  },
  {
    name: "Second Brain",
    shortName: "Second Brain",
    description: "Save notes, links and files; the AI connects them to your studies.",
    tier: "pro",
  },
  {
    name: "Hands-on labs",
    shortName: "Hands-on labs",
    description: "Guided, real-tool practice for every certification topic.",
    tier: "plus",
  },
  {
    name: "The incident simulator",
    shortName: "Incident simulator",
    description: "Work realistic troubleshooting tickets like a help-desk pro.",
    tier: "plus",
  },
  {
    name: "Virtual computer and mobile practice",
    shortName: "Virtual computer & mobile",
    description: "Practice Windows, PowerShell, Linux and mobile support workflows in safe simulated environments.",
    tier: "plus",
  },
  {
    name: "The exam simulator",
    shortName: "Exam simulator",
    description: "Full timed practice exams that mirror the real thing.",
    tier: "plus",
  },
];

function featureByName(name: string): ProFeature {
  return (
    PRO_FEATURES.find((f) => f.name === name) ?? {
      name,
      shortName: name,
      description: "",
      tier: "pro",
    }
  );
}

/**
 * Gates a paid feature behind the plan that includes it. Users on a high
 * enough plan see the children; everyone else sees an upgrade prompt that
 * names the current page's feature and lists every other paid feature.
 * "plus" features unlock with Plus or Pro; "pro" features need full Pro.
 */
export function ProGate({
  feature,
  children,
}: {
  /** Name of the gated feature, must match an entry in PRO_FEATURES. */
  feature: string;
  children: ReactNode;
}) {
  const { userId, ready } = useAuth();
  const { tier, loading } = useSubscription();

  if (!ready || loading) {
    return (
      <div className="panel p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }

  const current = featureByName(feature);
  const unlocked =
    tier === "pro" || (current.tier === "plus" && tier === "plus");
  if (unlocked) return <>{children}</>;

  const planName = current.tier === "plus" ? "Plus or Pro" : "Pro";
  const others = PRO_FEATURES.filter((entry) => entry.name !== feature);

  return (
    <div className="panel border-primary/30 p-6 sm:p-8">
      <div className="text-center">
        <Crown className="mx-auto size-8 text-primary" aria-hidden />
        <h2 className="mt-3 font-display text-lg font-semibold">
          Unlock {current.shortName}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {userId
            ? `Upgrade to IT PATH ${planName} to use ${current.shortName}, and the other paid features below.`
            : `Create a free account and upgrade to ${planName} to use ${current.shortName}, and the other paid features below.`}
        </p>
      </div>
      {others.length > 0 ? (
        <div className="mx-auto mt-6 max-w-md">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Paid plans also include
          </p>
          <ul className="mt-3 space-y-2.5">
            {others.map((entry) => (
              <li key={entry.name} className="flex items-start gap-2.5 text-left">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-sm">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {entry.shortName}
                    <Crown className="size-3 text-primary" aria-hidden />
                    {entry.tier === "pro" ? (
                      <span className="rounded border border-primary/40 px-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Pro
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">, {entry.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/pricing">See plans</Link>
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
