import { createFileRoute, Link } from "@tanstack/react-router";
import { Bug, Mail, Wrench } from "lucide-react";

import autopathLogo from "@/assets/autopath-logo.png.asset.json";
import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTabs, ABOUT_TABS } from "@/components/layout/section-tabs";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
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
      <SectionTabs tabs={ABOUT_TABS} />
      <PageHeader
        title="About IT PATH"
        description="I created IT PATH to give people starting out in IT and cybersecurity a structured, practical way to study."
        actions={
          <Button asChild variant="secondary">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="What IT PATH is">
          <p className="text-sm text-muted-foreground">
            I built IT PATH for beginners who want a clear route into IT and cybersecurity, with
            studying that feels active rather than an endless playlist. Each topic brings together
            lessons, recall, practice tasks, labs, quizzes, troubleshooting and teach-back. It suits
            certification students, and anyone curious how the devices and networks they use every
            day actually work.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            The app only shows progress you have earned. Readiness scores, weak areas and insights are
            based on the work you actually complete.
          </p>
        </Panel>

        <Panel title="Creator">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              I&apos;m <span className="font-medium text-foreground">David Boley</span>, the designer,
              developer and maintainer of IT PATH.
            </p>
            <p>
              If you have feedback, a question or just want to say hello, email me at{" "}
              <a
                href="mailto:boleydavid7@outlook.com"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <Mail className="size-3.5" aria-hidden />
                boleydavid7@outlook.com
              </a>
              .
            </p>
            <Button asChild variant="outline" size="sm">
              <a href="mailto:boleydavid7@outlook.com?subject=IT%20PATH%20error%20report&body=Page%20or%20area%3A%0A%0AWhat%20happened%3A%0A%0AWhat%20you%20expected%3A%0A">
                <Bug className="size-4" aria-hidden />
                Report an error
              </a>
            </Button>
          </div>
        </Panel>

        <Panel title="Important: IT PATH does not issue certificates">
          <p className="text-sm text-muted-foreground">
            IT PATH is a study tool, not a certification provider. It does not award certificates,
            diplomas or qualifications, and it is not affiliated with CompTIA, Microsoft, Cisco or
            any other vendor. Completing work here does not count as earning an official certification.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            What IT PATH can give you is meaningful practice and a realistic view of your preparation.
            Scores and readiness estimates come from the work you record, but they cannot predict or
            guarantee an exam result. To become certified, you still need to register for and pass the
            official exam through the certification provider.
          </p>
        </Panel>

        <Panel title="Version">
          <p className="font-display text-3xl font-semibold tabular-nums">1.0</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This is the first public release. I plan to keep improving the lessons, practice material,
            labs and features over time.
          </p>
        </Panel>


        <Panel title="Other products">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <img
              src={autopathLogo.url}
              alt="AUTO PATH logo, a dark navy app icon with a chrome piston, blue wrench and circuit traces"
              className="size-32 shrink-0 rounded-2xl"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  AUTO PATH
                </h3>
                <Badge variant="secondary" className="gap-1">
                  <Wrench className="size-3" aria-hidden />
                  Coming soon
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                AUTO PATH is the next app I am building. It teaches automotive
                knowledge the same way IT PATH teaches IT: starting from zero,
                building to real diagnostic ability, with hands-on scenarios and
                a scan-tool simulator that mirrors how real shops find faults.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                It runs on the same learning engine as IT PATH, including GAYL,
                so the way you study stays familiar: read, recall, practice, and
                get honest feedback based on your own work. Keep an eye out,
                more news is coming.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Data and privacy">
          <p className="text-sm text-muted-foreground">
            An offline copy of your study data is kept in your browser. If you sign in, it is also
            backed up to your account so you can continue on another device. I do not sell your
            personal data.
          </p>
        </Panel>
      </div>
    </>
  );
}
