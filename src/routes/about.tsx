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
        description="A serious, certification-based study platform for people starting out in IT and cybersecurity."
        actions={
          <Button asChild variant="secondary">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What IT PATH is">
          <p className="text-sm text-muted-foreground">
            IT PATH is built for beginners who want a real path into IT and cybersecurity. It treats
            certification study as a skill you practice, not a list of videos to watch. Every topic
            has a lesson, recall questions, practice tasks, hands-on labs, quizzes, troubleshooting
            incidents and a teach-back step — so you learn, prove it, and remember it.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing is faked. Progress, readiness scores, weak areas and insights all come from work
            you actually record in the app.
          </p>
        </Panel>

        <Panel title="Creator">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">David Boley</span> — designer, developer
              and maintainer of IT PATH.
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
            This is the first public release. More certifications, labs and features are planned.
          </p>
        </Panel>

        <Panel title="Data and privacy">
          <p className="text-sm text-muted-foreground">
            Your study data is stored locally in your browser. If you sign in, it is backed up to
            your account so you can continue on another device. We do not sell or share your data.
          </p>
        </Panel>
      </div>
    </>
  );
}
