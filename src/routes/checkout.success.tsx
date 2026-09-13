import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

import { PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [
      { title: "Purchase complete — IT PATH" },
      { name: "description", content: "Your IT PATH Pro purchase is confirmed." },
      { property: "og:title", content: "Purchase complete — IT PATH" },
      { property: "og:description", content: "Your IT PATH Pro purchase is confirmed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { isPro, loading } = useSubscription();

  useEffect(() => {
    // The webhook usually lands within seconds; the realtime subscription in
    // useSubscription picks it up automatically.
  }, []);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Purchase complete" />
      <div className="panel p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-semibold">
          {isPro ? "Welcome to IT PATH Pro" : "Confirming your purchase…"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isPro
            ? "Your lifetime access is active. The AI Tutor, AI grading, labs and the incident simulator are all unlocked."
            : loading
              ? "Checking your account…"
              : "Your payment went through. Pro features unlock automatically the moment the payment provider confirms it — this usually takes a few seconds."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/ai-tutor">Try the AI Tutor</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
