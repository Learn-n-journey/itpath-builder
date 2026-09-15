import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/meet-gayl")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Meet GAYL, Grades Aren't Your Legacy" },
      {
        name: "description",
        content:
          "GAYL is IT PATH's learning guide. She believes grades are a snapshot, not a sentence, and helps you figure out what to do next.",
      },
      { property: "og:title", content: "Meet GAYL, Grades Aren't Your Legacy" },
      {
        property: "og:description",
        content:
          "GAYL is IT PATH's learning guide. She believes grades are a snapshot, not a sentence, and helps you figure out what to do next.",
      },
    ],
  }),
  component: MeetGaylPage,
});

function MeetGaylPage() {
  return (
    <>
      <PageHeader
        title="Meet GAYL"
        description="Grades aren't your legacy. They don't tell the whole story about what you understand, what you can do, or who you can become."
        actions={
          <Button asChild variant="secondary">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What GAYL means">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">GAYL</span> stands for{" "}
            <span className="italic">Grades Aren't Your Legacy</span>.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            That means two things. First, a grade is only a snapshot of how you did in one moment. It
            does not always show whether you truly understand something, whether you will remember it
            next week, or whether you can use it when it matters.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Second, a grade should never become a label that defines your intelligence, your
            potential, or your future. One low score does not mean you are bad at a subject. One high
            score does not mean you have nothing left to learn.
          </p>
        </Panel>

        <Panel title="How GAYL sees you">
          <p className="text-sm text-muted-foreground">
            GAYL does not look at a learner and decide they are "bad" at something. She looks at what
            happened and tries to understand why.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Maybe the idea was new and needs more time. Maybe a simpler concept underneath it still
            needs work. Maybe the question was read too quickly. Maybe the material simply has not
            been reviewed in a while.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Whatever the reason, GAYL uses it to help figure out what should happen next, not to
            judge you.
          </p>
        </Panel>

        <Panel title="What GAYL does">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <Heart className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>She notices what you have learned and what still needs attention.</span>
            </li>
            <li className="flex gap-3">
              <Heart className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>She suggests the next small step instead of piling everything on at once.</span>
            </li>
            <li className="flex gap-3">
              <Heart className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>She brings things back for review before you forget them.</span>
            </li>
            <li className="flex gap-3">
              <Heart className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>She celebrates real progress, not just perfect scores.</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Why this matters">
          <p className="text-sm text-muted-foreground">
            IT and cybersecurity are deep fields. No one understands everything on the first try.
            What matters is not where you start or how fast you move. What matters is that you keep
            going, that you learn from mistakes, and that you build real understanding over time.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            GAYL is here to keep your progress honest without making it personal. She helps you see
            where you are, points you toward the next right thing, and reminds you that a number on a
            screen is not who you are.
          </p>
        </Panel>
      </div>
    </>
  );
}
