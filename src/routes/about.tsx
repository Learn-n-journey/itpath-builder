import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "About IT PATH" },
      {
        name: "description",
        content:
          "IT PATH is a serious, certification-based study platform for IT and cybersecurity beginners. Created by David Boley.",
      },
      { property: "og:title", content: "About IT PATH" },
      {
        property: "og:description",
        content:
          "A structured, certification-based path from IT beginner to cybersecurity professional.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHeader
        title="About IT PATH"
        description="I built IT PATH as a serious, certification-based study platform for people starting out in IT and cybersecurity."
        actions={
          <Button asChild variant="secondary">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What IT PATH is">
          <p className="text-sm text-muted-foreground">
            I built IT PATH for beginners who want a real path into IT and cybersecurity. I believe
            certification study should be a skill you practice, not a list of videos you watch. Every
            topic combines lessons, recall questions, practice tasks, hands-on labs, quizzes,
            troubleshooting incidents and teach-back work so you can learn it, prove it and remember it.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            I do not fake progress. Your readiness scores, weak areas and insights come from work you
            actually record in the app.
          </p>
        </Panel>

        <Panel title="Creator">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              I&apos;m <span className="font-medium text-foreground">David Boley</span>, the designer,
              developer and maintainer of IT PATH.
            </p>
            <p>
              If you have feedback, questions or just want to say hello, you can reach me at{" "}
              <a
                href="mailto:boleydavid7@outlook.com"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <Mail className="size-3.5" aria-hidden />
                boleydavid7@outlook.com
              </a>
              .
            </p>
          </div>
        </Panel>

        <Panel title="Version">
          <p className="font-display text-3xl font-semibold tabular-nums">1.0</p>
          <p className="mt-2 text-sm text-muted-foreground">
             This is my first public release. I plan to keep expanding the certifications, labs and features.
          </p>
        </Panel>

        <Panel title="Data and privacy">
          <p className="text-sm text-muted-foreground">
            Your study data is stored locally in your browser. If you sign in, I back it up to your
            account so you can continue on another device. I do not sell or share your data.
          </p>
        </Panel>
      </div>
    </>
  );
}
