import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, Network, ShieldCheck, Wrench } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";

const URL = "https://it-path.net/practice-tests";
const TITLE = "Free CompTIA Practice Tests";
const DESCRIPTION =
  "Free CompTIA A+, Network+ and Security+ practice tests with answers and explanations. No sign-up required. Study weak topics with matching IT PATH guides.";

const TESTS = [
  {
    certId: "cert-comptia-a-plus",
    title: "CompTIA A+ Practice Test",
    exam: "220-1201 & 220-1202",
    description: "Practice hardware, operating systems, networking, command line, troubleshooting and IT support fundamentals.",
    icon: Wrench,
  },
  {
    certId: "cert-comptia-network-plus",
    title: "CompTIA Network+ Practice Test",
    exam: "N10-009",
    description: "Practice addressing, switching, routing, DNS, network operations, security and troubleshooting.",
    icon: Network,
  },
  {
    certId: "cert-comptia-security-plus",
    title: "CompTIA Security+ Practice Test",
    exam: "SY0-701",
    description: "Practice threats, vulnerabilities, security controls, architecture, operations and incident response.",
    icon: ShieldCheck,
  },
] as const;

export const Route = createFileRoute("/practice-tests/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: `${TITLE} | IT PATH` },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          description: DESCRIPTION,
          url: URL,
          isPartOf: { "@type": "WebSite", name: "IT PATH", url: "https://it-path.net/" },
          hasPart: TESTS.map((test) => ({
            "@type": "LearningResource",
            name: test.title,
            url: `${URL}/${test.certId}`,
            educationalLevel: "Beginner",
            learningResourceType: "Practice test",
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "IT PATH", item: "https://it-path.net/" },
            { "@type": "ListItem", position: 2, name: "Free CompTIA Practice Tests", item: URL },
          ],
        }),
      },
    ],
  }),
  component: PracticeTestsIndex,
});

function PracticeTestsIndex() {
  return (
    <main>
      <PageHeader
        title={TITLE}
        description="Test what you know with free A+, Network+ and Security+ questions, then use the matching study guides to work on anything you miss."
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/auth">Create a free account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/guides">
            <BookOpen className="size-4" aria-hidden />
            Browse study guides
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/tracks">CompTIA study tracks</Link>
        </Button>
      </div>

      <section aria-labelledby="choose-test">
        <h2 id="choose-test" className="mb-4 font-display text-xl font-semibold">Choose a free practice test</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {TESTS.map((test) => {
            const Icon = test.icon;
            return (
              <Panel key={test.certId} title={test.title} description={test.description}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4 text-primary" aria-hidden />
                  <span>Current exam: {test.exam}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />Free questions</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />Answers and explanations</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />No sign-up required</li>
                </ul>
                <Button asChild className="mt-5" size="sm">
                  <Link to="/practice-tests/$certId" params={{ certId: test.certId }}>
                    Start practice test <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </Panel>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="How the free practice tests work">
        <Panel title="Practice, then study the gap">
          <p className="text-sm leading-7 text-muted-foreground">
            Each public test lets you answer questions and reveal the explanation without creating an account. When a topic needs more work, follow the related IT PATH study guide instead of memorizing the answer.
          </p>
        </Panel>
        <Panel title="Build beyond one test">
          <p className="text-sm leading-7 text-muted-foreground">
            A practice score is only one snapshot. IT PATH's full learning paths combine lessons, recall, practical work, labs, troubleshooting and repeated review so you can build evidence across the whole certification.
          </p>
        </Panel>
      </section>

      <section className="mt-8" aria-labelledby="practice-faq">
        <Panel title="Free CompTIA practice test FAQ">
          <div id="practice-faq" className="space-y-5 text-sm leading-7">
            <div>
              <h2 className="font-semibold text-foreground">Do I need an IT PATH account?</h2>
              <p className="text-muted-foreground">No. The public A+, Network+ and Security+ practice questions can be used without signing in.</p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Do the questions include explanations?</h2>
              <p className="text-muted-foreground">Yes. You can reveal the answer and explanation for each public question so you can understand the reasoning, not just check a letter.</p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">What should I do when I miss a topic?</h2>
              <p className="text-muted-foreground">Use the related free study guide and certification track, then return to practice after you can explain and apply the concept.</p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Are these official CompTIA exam questions?</h2>
              <p className="text-muted-foreground">No. IT PATH creates its own study and practice material. CompTIA certifications and trademarks belong to CompTIA.</p>
            </div>
          </div>
        </Panel>
      </section>
    </main>
  );
}
