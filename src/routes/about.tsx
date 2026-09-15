import { createFileRoute, Link } from "@tanstack/react-router";
import { Bug, Mail, Wrench } from "lucide-react";

import autopathLogo from "@/assets/autopath-logo.png.asset.json";
import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
            I built IT PATH for beginners who want a clear route into IT and cybersecurity. I wanted
            studying for a certification to feel active, not like working through an endless playlist.
            Each topic brings together lessons, recall questions, practice tasks, hands-on labs,
            quizzes, troubleshooting incidents and teach-back exercises to help you understand the
            material and remember it.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            It is designed with students in mind, but it is just as useful if you are simply curious
            about the technology you use every day. Most of us spend our lives interfacing with
            devices, networks and accounts, understanding how they work is practical knowledge for
            almost anyone.
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
