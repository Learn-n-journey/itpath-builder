import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { navGroups, navItems } from "@/config/navigation";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "How IT PATH Works — Study Guide" },
      {
        name: "description",
        content:
          "What every section of IT PATH is for, the order to use them in, and exactly how progress, readiness and mastery are calculated.",
      },
      { property: "og:title", content: "How IT PATH Works — Study Guide" },
      {
        property: "og:description",
        content: "A short orientation: the study loop, each section's job, and what every score means.",
      },
    ],
  }),
  component: GuidePage,
});

const STEPS: Array<{ title: string; body: string; to: string; cta: string }> = [
  {
    title: "1. Set your goal",
    body: "Choose your certification target, experience level, study days and session length. Everything else is ordered around those answers.",
    to: "/settings",
    cta: "Open Settings",
  },
  {
    title: "2. Learn one topic",
    body: "Read the lesson, then answer the recall questions, work the practice activity, teach it back in your own words and decide the real-world scenario.",
    to: "/learn",
    cta: "Open Learn",
  },
  {
    title: "3. Prove it in practice",
    body: "Run the lab for the topic, work a written practice task, then take a quiz. Scores only move when you produce work.",
    to: "/labs",
    cta: "Open Labs",
  },
  {
    title: "4. Come back to what you got wrong",
    body: "Every wrong answer is logged. Review schedules it again on a spacing ladder; Weak Areas builds a quiz out of it.",
    to: "/review",
    cta: "Open Review",
  },
  {
    title: "5. Run a timed session",
    body: "Study Plan assembles one session from your due reviews, weak topics and next topic. Pomodoro logs the minutes as you go.",
    to: "/study-plan",
    cta: "Open Study Plan",
  },
];

const DIMENSIONS: Array<[string, string]> = [
  ["Understanding", "Recorded when you work through a lesson and answer its questions."],
  ["Recall", "From recall questions answered without the lesson in front of you."],
  ["Application", "From practice activities and written practice tasks."],
  ["Practical ability", "From completed labs and their checklists."],
  ["Troubleshooting", "From incidents and career tickets you diagnose, fix and verify."],
  ["Retention", "From passing spaced reviews at longer and longer intervals."],
];

const VOCABULARY: Array<[string, string]> = [
  [
    "Mastered topic",
    "All six skill dimensions for that topic are high, backed by recorded work — not just by opening the lesson.",
  ],
  [
    "Mastered review",
    "You passed that topic's review at the final 90-day step on the ladder of 1, 3, 7, 14, 30, 60 and 90 days.",
  ],
  [
    "Mastered lab",
    "You completed the lab and wrote a reflection that shows you understood why the steps worked.",
  ],
  [
    "Certification readiness",
    "A weighted figure from topic scores, quizzes, labs and practice for that certification's topics only.",
  ],
  [
    "Career readiness",
    "Skills are scored from evidence across every activity, then weighted for each job track.",
  ],
  [
    "Open mistake",
    "A missed question still waiting to be answered correctly. Answering it right clears it.",
  ],
];

function GuidePage() {
  return (
    <>
      <PageHeader
        title="How IT PATH works"
        description="A two-minute orientation: the study loop, what each section is for, and how every number on screen is calculated."
        actions={
          <Button asChild variant="secondary">
            <Link to="/">
              <Compass className="size-4" aria-hidden /> Back to dashboard
            </Link>
          </Button>
        }
      />

      <Panel
        title="The study loop"
        description="Follow this order the first time through. After that, the dashboard tells you what is next."
      >
        <ol className="space-y-4">
          {STEPS.map((step) => (
            <li key={step.title} className="rounded-lg border border-border p-4">
              <h3 className="font-display text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              <Button asChild size="sm" variant="secondary" className="mt-3">
                <Link to={step.to}>{step.cta}</Link>
              </Button>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="What each section is for"
          description="Several sections test you in different ways. This is the difference."
        >
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group}
                </p>
                <ul className="mt-2 space-y-2 text-sm">
                  {navItems
                    .filter((item) => item.group === group && item.to !== "/guide")
                    .map((item) => (
                      <li key={item.to}>
                        <Link to={item.to} className="font-medium text-primary hover:underline">
                          {item.label}
                        </Link>
                        <span className="text-muted-foreground"> — {item.description}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title="The six skill dimensions"
            description="Every topic is scored on six separate measures. Reading alone only moves the first one."
          >
            <ul className="space-y-2 text-sm">
              {DIMENSIONS.map(([term, meaning]) => (
                <li key={term}>
                  <span className="font-medium">{term}</span>
                  <span className="text-muted-foreground"> — {meaning}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="What the words mean"
            description="The same word can mean different things on different pages, so here they are side by side."
          >
            <ul className="space-y-2 text-sm">
              {VOCABULARY.map(([term, meaning]) => (
                <li key={term}>
                  <span className="font-medium">{term}</span>
                  <span className="text-muted-foreground"> — {meaning}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Honest numbers">
            <p className="text-sm text-muted-foreground">
              Nothing here is simulated. Every percentage, streak and readiness figure comes from work
              you recorded on this device, and your data is saved locally in this browser. If you have
              done nothing yet, everything reads zero — that is correct, not a fault.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              IT PATH does not issue certificates and is not affiliated with any exam vendor. Readiness
              is an estimate of your preparation, not a qualification or a guarantee of passing the
              real exam.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
