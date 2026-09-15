import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Sparkles } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/meet-gayl")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Meet GAYL — Your IT PATH Learning Guide" },
      {
        name: "description",
        content:
          "GAYL is IT PATH's built-in learning intelligence. She watches your progress, spots what you need, and points you to the right next step.",
      },
      { property: "og:title", content: "Meet GAYL — Your IT PATH Learning Guide" },
      {
        property: "og:description",
        content:
          "GAYL is IT PATH's built-in learning intelligence. She watches your progress, spots what you need, and points you to the right next step.",
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
        description="GAYL is the learning intelligence built into IT PATH. She watches how you study, figures out what you need, and guides you to the right next move."
        actions={
          <Button asChild variant="secondary">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What GAYL stands for">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">GAYL</span> is short for{" "}
            <span className="italic">Guided Adaptive Learning</span>. She is not a chatbot you talk
            to — she is the quiet engine running behind every page, turning your recorded work into
            a clear picture of what you know, what you are shaky on, and what you should do next.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Every lesson you read, quiz you take, lab you run, practice task you write, and incident
            you solve feeds into GAYL. She uses that evidence to build a live model of your learning
            and keeps it updated as you go.
          </p>
        </Panel>

        <Panel title="What GAYL actually does">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Observes.</strong> She records every meaningful
                interaction — correct answers, mistakes, hesitations, retries, and skipped topics.
              </span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Diagnoses.</strong> She figures out why you
                missed something — a forgotten fact, a shaky concept, a misread question, or a
                missing prerequisite.
              </span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Prescribes.</strong> She picks the teaching
                method, difficulty, and activity type most likely to move you forward.
              </span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Schedules.</strong> She decides when you should
                review something so it sticks, without cramming or overloading you.
              </span>
            </li>
          </ul>
        </Panel>

        <Panel title="How GAYL is different from the AI Tutor">
          <p className="text-sm text-muted-foreground">
            The AI Tutor is the chat panel you can open when you want to ask a question. GAYL is
            different — she does not wait for you to ask. She is always working in the background,
            shaping your study plan, your next-topic suggestions, your review schedule, and the
            difficulty of the work you see.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Where the AI Tutor explains things in words, GAYL decides what is worth explaining and
            when. The two work together: GAYL spots a gap, and the AI Tutor can help you close it if
            you want to talk it through.
          </p>
        </Panel>

        <Panel title="What GAYL sees">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <Brain className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Your accuracy and speed on quizzes and practice tasks.</span>
            </li>
            <li className="flex gap-3">
              <Brain className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Which topics you have attempted and which you have not yet touched.</span>
            </li>
            <li className="flex gap-3">
              <Brain className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>How long it has been since you last saw a concept.</span>
            </li>
            <li className="flex gap-3">
              <Brain className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Whether you can apply a concept in labs, incidents, and real-world scenarios.</span>
            </li>
            <li className="flex gap-3">
              <Brain className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Repeated mistakes and the patterns behind them.</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Why GAYL matters">
          <p className="text-sm text-muted-foreground">
            Studying for an IT or cybersecurity certification is a lot of material. It is easy to
            spend time on what you already know, skip what you do not, or forget something right
            after you learned it. GAYL's job is to keep you honest about where you actually are and
            steer your time toward the highest-value work.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            She will not pretend you know something you have never practiced. She will not drill you
            on topics you have already proven. And she will not let a weak prerequisite hide behind a
            lucky guess.
          </p>
        </Panel>

        <Panel title="Where GAYL shows up">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Dashboard</strong> — your next recommended
                actions come from GAYL.
              </span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Study Plan</strong> — the order and difficulty of
                your session are chosen by GAYL.
              </span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Review</strong> — GAYL decides when a topic is
                due again.
              </span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <strong className="text-foreground">Learner profile</strong> — your mastery,
                retention, and readiness views are built by GAYL.
              </span>
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
