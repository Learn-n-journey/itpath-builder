import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/refund-policy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Refund Policy — IT PATH" },
      {
        name: "description",
        content: "IT PATH offers a 30-day money-back guarantee on all purchases, processed by Paddle.",
      },
      { property: "og:title", content: "Refund Policy — IT PATH" },
      {
        property: "og:description",
        content: "30-day money-back guarantee on all IT PATH purchases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Refund policy"
        description="Last updated: September 2026"
      />
      <Panel>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            We offer a 30-day money-back guarantee. If you're not satisfied with
            your purchase, you can request a full refund within 30 days of your
            order date — no questions asked.
          </p>
          <p>
            Refunds are processed by our payment provider, Paddle. To request a
            refund, visit{" "}
            <a
              href="https://paddle.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              paddle.net
            </a>{" "}
            or contact us at{" "}
            <a href="mailto:boleydavid7@outlook.com" className="text-primary underline">
              boleydavid7@outlook.com
            </a>
            .
          </p>
          <p>
            Once a refund is issued, Pro access is removed from your account.
            Your study progress and data remain yours and are not deleted.
          </p>
        </div>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/pricing">Back to pricing</Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
