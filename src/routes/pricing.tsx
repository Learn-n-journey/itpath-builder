import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Brain,
  Check,
  Crown,
  Cpu,
  FileText,
  GraduationCap,
  MessageSquareText,
  MonitorCog,
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/state/auth-state";

export const Route = createFileRoute("/pricing")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Pricing | IT PATH" },
      {
        name: "description",
        content:
          "Start free with the full lesson library. Plus ($7/month) unlocks labs and simulators; Pro ($15/month) adds AI tutoring, AI grading and the Second Brain.",
      },
      { property: "og:title", content: "IT PATH Pricing" },
      {
        property: "og:description",
        content:
          "Free tier, Plus from $7/month for hands-on labs and simulators, and Pro from $15/month with AI tutoring and AI grading.",
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
  "Daily Challenge with a tracked study streak and freezes",
  "Progress tracking, insights and study record",
  "Cloud backup of your progress when signed in",
];

const PLUS_FEATURES = [
  "Everything in Free",
  "Adaptive learning engine that picks your next best topic",
  "All 100+ hands-on labs and fault drills",
  "Troubleshooting incident simulator",
  "Virtual computer and mobile practice with integrated command-line training",
  "Exam simulator and certification readiness scoring",
];

const PRO_FEATURES = [
  "Everything in Plus",
  "AI Tutor with context-aware answers and study guidance",
  "AI grading and detailed feedback on written answers",
  "Second Brain for notes, screenshots, PDFs, articles and videos",
];

interface TopFeature {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
}

const TOP_FEATURES: TopFeature[] = [
  {
    icon: Brain,
    title: "Adaptive learning engine",
    description:
      "A live model of what you know, what you are forgetting and where you are guessing. It routes you to the exact topic, difficulty and activity you need next.",
  },
  {
    icon: MessageSquareText,
    title: "AI Tutor",
    description:
      "Ask any IT or cybersecurity question and get clear explanations, step-by-step walkthroughs and study guidance tied to your current progress.",
  },
  {
    icon: GraduationCap,
    title: "AI grading and feedback",
    description:
      "Type your answer in your own words. The AI evaluates meaning, explains what you missed and teaches the concept before you move on.",
  },
  {
    icon: FileText,
    title: "Second Brain",
    description:
      "Save notes, screenshots, PDFs, articles, videos and links. The AI extracts concepts and connects them to your lessons, quizzes and tutor sessions.",
  },
  {
    icon: Wrench,
    title: "Hands-on labs",
    description:
      "Work through guided and challenge-mode labs covering hardware, networking, Windows, Linux, mobile devices and security.",
  },
  {
    icon: MonitorCog,
    title: "Incident simulator",
    description:
      "Practice troubleshooting realistic IT incidents with random faults, guided hints and full scoring reports that update your learner model.",
  },
  {
    icon: Terminal,
    title: "Virtual computer & mobile",
    description:
      "Practice desktop and mobile support workflows in safe simulated environments, including integrated command-line troubleshooting where the scenario calls for it.",
  },
  {
    icon: Cpu,
    title: "Certification readiness",
    description:
      "See exactly how prepared you are for A+, Security+, Network+ and other exams based on real activity, not guesswork.",
  },
];

type BillingPeriod = "monthly" | "yearly";

interface ProductPrice {
  id: string;
  period: BillingPeriod;
  price: string;
  cadence: string;
  note: string;
}

interface PaidProduct {
  id: string;
  name: string;
  tier: "plus" | "pro";
  features: string[];
  prices: ProductPrice[];
}

const PAID_PRODUCTS: PaidProduct[] = [
  {
    id: "plus",
    name: "Plus",
    tier: "plus",
    features: PLUS_FEATURES,
    prices: [
      {
        id: "itpath_plus_monthly",
        period: "monthly",
        price: "$7",
        cadence: "per month",
        note: "All the hands-on practice, without the AI features.",
      },
      {
        id: "itpath_plus_yearly",
        period: "yearly",
        price: "$69",
        cadence: "per year",
        note: "Save $15 compared to paying monthly.",
      },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tier: "pro",
    features: PRO_FEATURES,
    prices: [
      {
        id: "itpath_pro_monthly",
        period: "monthly",
        price: "$15",
        cadence: "per month",
        note: "Flexible. Cancel anytime, keep access until the period ends.",
      },
      {
        id: "itpath_pro_yearly",
        period: "yearly",
        price: "$149",
        cadence: "per year",
        note: "Save $31 compared to paying monthly.",
      },
    ],
  },
];

function PricingPage() {
  const { userId, email, ready } = useAuth();
  const { tier, loading } = useSubscription();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const navigate = useNavigate();

  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, BillingPeriod>>({
    plus: "monthly",
    pro: "monthly",
  });

  const selectedPrice = (product: PaidProduct) =>
    product.prices.find((p) => p.period === selectedPeriods[product.id]) ?? product.prices[0]!;

  const planCovered = (product: PaidProduct) =>
    tier === "pro" || (product.tier === "plus" && tier === "plus");

  const buy = async (product: PaidProduct) => {
    if (!ready) return;
    if (!userId) {
      toast.message("Sign in first", {
        description: "Create a free account so your purchase is linked to it.",
      });
      void navigate({ to: "/auth" });
      return;
    }
    const price = selectedPrice(product);
    try {
      await openCheckout({
        priceId: price.id,
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

  const updatePeriod = (productId: string, period: BillingPeriod) => {
    setSelectedPeriods((prev) => ({ ...prev, [productId]: period }));
  };

  return (
    <div>
      <PageHeader
        title="Pricing"
        description="Study free for as long as you like. Plus unlocks the hands-on practice tools, Pro adds the AI features."
      />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
              <Link to="/dashboard">Start studying</Link>
            </Button>
          </div>
        </Panel>

        {PAID_PRODUCTS.map((product) => {
          const price = selectedPrice(product);
          const isYearlyBestValue = product.id === "pro" && price.period === "yearly";

          return (
            <Panel
              key={product.id}
              title={product.name}
              description={price.note}
              className={isYearlyBestValue ? "border-primary/40" : undefined}
            >
              {isYearlyBestValue && (
                <div className="flex items-center gap-2 text-primary">
                  <Crown className="size-4" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wide">Best value</span>
                </div>
              )}

              <div className="mt-3 flex items-baseline gap-3">
                <p className="font-display text-3xl font-semibold">{price.price}</p>
                <p className="text-sm text-muted-foreground">{price.cadence}</p>
              </div>

              <div className="mt-4">
                <Select
                  value={price.period}
                  onValueChange={(value) => updatePeriod(product.id, value as BillingPeriod)}
                >
                  <SelectTrigger className="w-full" aria-label={`${product.name} billing period`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {product.prices.map((p) => (
                      <SelectItem key={p.id} value={p.period}>
                        {p.period === "monthly" ? "Monthly" : "Yearly"}, {p.price}/{p.period === "monthly" ? "mo" : "yr"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ul className="mt-5 space-y-2.5">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {planCovered(product) ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
                    <ShieldCheck className="size-4 text-primary" aria-hidden />
                    {tier === "pro"
                      ? "You have IT PATH Pro. Thank you for supporting the app."
                      : "You have IT PATH Plus. Thank you for supporting the app."}
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    variant={isYearlyBestValue ? "default" : "outline"}
                    onClick={() => void buy(product)}
                    disabled={checkoutLoading || loading}
                  >
                    {checkoutLoading
                      ? "Opening checkout…"
                      : `Get ${product.name} ${price.period === "monthly" ? "Monthly" : "Yearly"}, ${price.price}`}
                  </Button>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Top paid features</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything that makes IT PATH more than a static course.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOP_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-primary">
                  <Icon className="size-5" aria-hidden />
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        IT PATH is a study tool. It does not issue certificates and is not affiliated with CompTIA,
        Microsoft, Cisco or any other vendor, it prepares you for their exams and gives you an
        honest idea of your progress.
      </p>

      {tier === "free" && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure checkout by Paddle. 30-day money-back guarantee on every plan, see the{" "}
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
