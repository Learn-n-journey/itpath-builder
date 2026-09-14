import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Crown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/state/auth-state";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — IT PATH" },
      {
        name: "description",
        content:
          "Start free with the full lesson library, or unlock AI tutoring, AI grading, labs and certification tracking with IT PATH Pro — monthly or yearly.",
      },
      { property: "og:title", content: "IT PATH Pricing" },
      {
        property: "og:description",
        content:
          "Free tier plus Pro plans from $15/month — unlock AI tutoring, AI grading, labs and the troubleshooting simulator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

const FREE_FEATURES = [
  "Full lesson library across all certifications",
  "Practice tasks with meaning-based grading",
  "Quizzes, review buckets and weak-area sets",
  "Progress tracking, insights and study record",
  "Cloud backup of your progress",
];

const PRO_FEATURES = [
  "Everything in Free",
  "AI Tutor that answers in the app, in context",
  "AI grading with a full tutoring response on every written answer",
  "All 100+ hands-on labs and fault drills",
  "Troubleshooting incident simulator",
  "Certification readiness scoring",
];

interface PaidPlan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  priceId: string;
  note: string;
  featured?: boolean;
}

const PAID_PLANS: PaidPlan[] = [
  {
    id: "monthly",
    name: "Pro — Monthly",
    price: "$15",
    cadence: "per month",
    priceId: "itpath_pro_monthly",
    note: "Flexible. Cancel anytime, keep access until the period ends.",
  },
  {
    id: "yearly",
    name: "Pro — Yearly",
    price: "$149",
    cadence: "per year",
    priceId: "itpath_pro_yearly",
    note: "Save $31 compared to paying monthly.",
    featured: true,
  },
];

function PricingPage() {
  const { userId, email, ready } = useAuth();
  const { isPro, loading } = useSubscription();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const navigate = useNavigate();

  const buy = async (plan: PaidPlan) => {
    if (!ready) return;
    if (!userId) {
      toast.message("Sign in first", {
        description: "Create a free account so your purchase is linked to it.",
      });
      void navigate({ to: "/auth" });
      return;
    }
    try {
      await openCheckout({
        priceId: plan.priceId,
        quantity: 1,
        ...(email ? { customerEmail: email } : {}),
        customData: { userId },
        successUrl: `${window.location.origin}/checkout/success`,
      });
    } catch (e) {
      toast.error("Checkout couldn't open", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Pricing"
        description="Study free for as long as you like. Upgrade to Pro whenever you're ready — monthly or yearly."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Free" description="The complete study system, at no cost.">
          <p className="font-display text-3xl font-semibold">$0</p>
          <p className="mt-1 text-sm text-muted-foreground">Forever</p>
          <ul className="mt-5 space-y-2.5">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Button asChild variant="outline" className="w-full">
              <Link to="/learn">Start studying</Link>
            </Button>
          </div>
        </Panel>

        {PAID_PLANS.map((plan) => (
          <Panel
            key={plan.id}
            title={plan.name}
            description={plan.note}
            className={plan.featured ? "border-primary/40" : undefined}
          >
            {plan.featured && (
              <div className="flex items-center gap-2 text-primary">
                <Crown className="size-4" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Best value
                </span>
              </div>
            )}
            <p className="mt-3 font-display text-3xl font-semibold">{plan.price}</p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.cadence}</p>
            <ul className="mt-5 space-y-2.5">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isPro ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
                  <ShieldCheck className="size-4 text-primary" aria-hidden />
                  You have IT PATH Pro. Thank you for supporting the app.
                </div>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.featured ? "default" : "outline"}
                  onClick={() => void buy(plan)}
                  disabled={checkoutLoading || loading}
                >
                  {checkoutLoading
                    ? "Opening checkout…"
                    : `Get ${plan.name.replace("Pro — ", "")} — ${plan.price}`}
                </Button>
              )}
            </div>
          </Panel>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        IT PATH is a study tool. It does not issue certificates and is not affiliated with CompTIA,
        Microsoft, Cisco or any other vendor — it prepares you for their exams and gives you an
        honest idea of your progress.
      </p>

      {!isPro && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure checkout by Paddle. 30-day money-back guarantee on every plan — see the{" "}
          <Link to="/refund-policy" className="underline">
            refund policy
          </Link>
          . Subscriptions can be cancelled anytime; you keep access until the end of the
          paid period.
        </p>
      )}
    </div>
  );
}
