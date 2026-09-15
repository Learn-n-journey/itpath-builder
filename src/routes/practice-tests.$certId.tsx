import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { practiceActivities } from "@/data/learning-content";
import { topics } from "@/data/static-content";
import { getCertification } from "@/lib/app-data/selectors";

export const Route = createFileRoute("/practice-tests/$certId")({
  staticData: { sitemap: true },
  head: ({ params }) => {
    const page = PRACTICE_TEST_PAGES[params.certId];
    if (!page) {
      return {
        meta: [
          { title: "Page not found | IT PATH" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const url = `https://it-path.net/practice-tests/${params.certId}`;
    return {
      meta: [
        { title: `${page.headTitle} | IT PATH` },
        { name: "description", content: page.headDescription },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:title", content: page.headTitle },
        { property: "og:description", content: page.headDescription },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "IT PATH", item: "https://it-path.net/" },
              { "@type": "ListItem", position: 2, name: "Free Practice Tests", item: "https://it-path.net/practice-tests/comptia-a-plus" },
              { "@type": "ListItem", position: 3, name: page.headTitle, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: PracticeTestPage,
});

interface PracticeTestPageSpec {
  certId: string;
  headTitle: string;
  headDescription: string;
  h1: string;
  intro: string[];
}

const PRACTICE_TEST_PAGES: Record<string, PracticeTestPageSpec> = {
  "cert-comptia-a-plus": {
    certId: "cert-comptia-a-plus",
    headTitle: "Free CompTIA A+ Practice Test",
    headDescription:
      "Free CompTIA A+ practice questions with answers and explanations. Hardware, operating systems, networking, command line and more. No sign-up needed.",
    h1: "Free CompTIA A+ Practice Test",
    intro: [
      "The CompTIA A+ certification (exams 220-1201 and 220-1202) is the usual starting point for a career in IT support. It covers hardware, operating systems, networking basics, the command line, virtualization and the everyday procedures of a support role.",
      "The questions below come from the IT PATH curriculum and cover the same ground. Work through them in any order: pick an answer, reveal it, and read why the right answer is right. Everything here is free and you do not need an account.",
      "If you want the full version, IT PATH tracks every answer you give and scores your readiness against the whole syllabus, including the material you have not touched yet. Accounts are free.",
    ],
  },
  "cert-comptia-network-plus": {
    certId: "cert-comptia-network-plus",
    headTitle: "Free CompTIA Network+ Practice Test",
    headDescription:
      "Free CompTIA Network+ (N10-009) practice questions with answers and explanations. Addressing, DNS, routing, troubleshooting. No sign-up needed.",
    h1: "Free CompTIA Network+ Practice Test",
    intro: [
      "The CompTIA Network+ certification (exam N10-009) is for people who want to build, run and fix networks. It covers the OSI and TCP/IP models, IPv4 addressing, switching and routing, DNS, monitoring tools and network troubleshooting.",
      "The questions below come from the IT PATH curriculum and cover that same ground. Pick an answer, reveal it, and read the explanation so the reasoning sticks. Everything here is free and you do not need an account.",
      "IT PATH goes further: it records every answer you give and scores your readiness against the full Network+ syllabus, including what you have not studied yet. Accounts are free.",
    ],
  },
  "cert-comptia-security-plus": {
    certId: "cert-comptia-security-plus",
    headTitle: "Free CompTIA Security+ Practice Test",
    headDescription:
      "Free CompTIA Security+ (SY0-701) practice questions with answers and explanations. Threats, controls, architecture, operations. No sign-up needed.",
    h1: "Free CompTIA Security+ Practice Test",
    intro: [
      "The CompTIA Security+ certification (exam SY0-701) is the standard entry point for security roles. It covers security concepts and controls, threats and vulnerabilities, secure architecture, operations and incident response.",
      "The questions below come from the IT PATH curriculum and cover that same ground. Work through them at your own pace: pick an answer, reveal it, and read why. Everything here is free and you do not need an account.",
      "IT PATH also keeps an honest record of what you know and what you have not covered yet, so you always know where you stand before exam day. Accounts are free.",
    ],
  },
};

const MAX_QUESTIONS = 18;

interface PublicQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

function questionsForCert(certId: string): PublicQuestion[] {
  const certTopicIds = new Set(
    topics.filter((topic) => topic.certificationId === certId).map((topic) => topic.id),
  );
  const seen = new Set<string>();
  const pool: PublicQuestion[] = [];
  for (const activity of practiceActivities) {
    if (!certTopicIds.has(activity.topicId)) continue;
    if (activity.choices.length < 3) continue;
    const key = activity.prompt.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({
      id: activity.id,
      prompt: activity.prompt,
      choices: activity.choices,
      answerIndex: activity.answerIndex,
      explanation: activity.explanation,
    });
  }
  // Rotate deterministically per certification so the three pages do not lead
  // with the same questions.
  const offset = certId.length % Math.max(pool.length, 1);
  return [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, MAX_QUESTIONS);
}

function QuestionCard({ question, number }: { question: PublicQuestion; number: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <li className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <p className="font-medium">
        <span className="mr-2 tabular-nums text-muted-foreground">{number}.</span>
        {question.prompt}
      </p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {question.choices.map((choice, index) => {
          const isAnswer = index === question.answerIndex;
          return (
            <li
              key={index}
              className={
                revealed && isAnswer
                  ? "flex items-start gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2"
                  : "flex items-start gap-2 rounded-md px-3 py-2"
              }
            >
              {revealed && isAnswer ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" aria-hidden />
              )}
              <span>{choice}</span>
            </li>
          );
        })}
      </ul>
      {/* Kept in the markup and toggled with CSS so the full answer and
          explanation exist in the served HTML for search engines. */}
      <div className={revealed ? "mt-3" : "mt-3 hidden"}>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Why: </span>
          {question.explanation}
        </p>
      </div>
      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRevealed((value) => !value)}
          aria-expanded={revealed}
        >
          {revealed ? "Hide answer" : "Reveal answer"}
        </Button>
      </div>
    </li>
  );
}

function PracticeTestPage() {
  const { certId } = Route.useParams();
  const spec = PRACTICE_TEST_PAGES[certId];

  if (!spec) {
    return (
      <>
        <PageHeader title="Page not found" description="This practice test does not exist." />
        <EmptyState
          icon={BookOpen}
          title="No practice test at this address"
          body="Free practice tests are available for CompTIA A+, Network+ and Security+."
        >
          <Button asChild>
            <Link to="/practice-tests/$certId" params={{ certId: "cert-comptia-a-plus" }}>
              Free CompTIA A+ Practice Test
            </Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const certification = getCertification(spec.certId);
  const questions = questionsForCert(spec.certId);
  const siblings = Object.values(PRACTICE_TEST_PAGES).filter((page) => page.certId !== spec.certId);
  const relatedTopics = topics
    .filter((topic) => topic.certificationId === spec.certId)
    .slice(0, 3);

  return (
    <article>
      <PageHeader title={spec.h1} description={`${questions.length} free questions with answers and explanations. No account needed.`} />

      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        {spec.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>

      <p className="mt-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        IT PATH is a study tool and does not issue certificates. For the official exam you register
        with CompTIA separately. {certification ? `This page follows the ${certification.code} objectives.` : ""}
      </p>

      <section className="mt-8" aria-label="Practice questions">
        <h2 className="font-display text-xl font-semibold">Practice questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the answer you think is right, then reveal it. Getting one wrong here costs nothing.
        </p>
        <ol className="mt-4 space-y-4">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} number={index + 1} />
          ))}
        </ol>
      </section>

      <Panel
        className="mt-8"
        title="Keep going with the full system"
        description="These questions are a sample. The full app grades every answer, keeps your record and tells you honestly what you have and have not covered."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/auth">
              Create a free account
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/learn">
              <BookOpen aria-hidden />
              Browse the lesson library
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/certifications/$certId" params={{ certId: spec.certId }}>
              <ExternalLink aria-hidden />
              {certification ? `${certification.title} topics` : "All certifications"}
            </Link>
          </Button>
        </div>
      </Panel>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="More free practice tests" description="Same format, different certification.">
          <ul className="space-y-2 text-sm">
            {siblings.map((sibling) => (
              <li key={sibling.certId}>
                <Link
                  to="/practice-tests/$certId"
                  params={{ certId: sibling.certId }}
                  className="font-medium text-primary hover:underline"
                >
                  {sibling.h1}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Study the topics behind these questions" description="Full lessons, free to read.">
          <ul className="space-y-2 text-sm">
            {relatedTopics.map((topic) => (
              <li key={topic.id}>
                <Link
                  to="/topics/$topicId"
                  params={{ topicId: topic.id }}
                  className="font-medium text-primary hover:underline"
                >
                  {topic.title}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </article>
  );
}
