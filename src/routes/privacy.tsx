import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/page-kit";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — IT PATH" },
      {
        name: "description",
        content:
          "How IT PATH collects, uses, shares and protects your personal data, and the rights you have over it.",
      },
      { property: "og:title", content: "Privacy Notice — IT PATH" },
      {
        property: "og:description",
        content: "What data IT PATH collects, why, who it is shared with and how long it is kept.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Privacy notice" description="Last updated: September 2026" />
      <Panel>
        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <p>
            IT PATH is operated by <strong className="text-foreground">David Boley</strong>, an
            individual sole proprietor in the United States, who is the data controller for the
            personal data described here. Contact:{" "}
            <a className="underline" href="mailto:boleydavid7@outlook.com">
              boleydavid7@outlook.com
            </a>
            .
          </p>

          <Section title="What we collect and why">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Account data</strong> — your email address and
                login credentials (or your Google sign-in identity). Used to create and secure your
                account. Legal basis: performance of our contract with you.
              </li>
              <li>
                <strong className="text-foreground">Study data</strong> — your progress, answers,
                notes, bookmarks, quiz attempts, labs, portfolio entries and study sessions. Used to
                run the service, back up your progress across devices and show your results. Legal
                basis: contract.
              </li>
              <li>
                <strong className="text-foreground">AI prompts and answers</strong> — the text you
                submit to the AI Tutor or for AI marking, plus a summary of your progress, is sent to
                our AI provider to generate a response. Legal basis: contract.
              </li>
              <li>
                <strong className="text-foreground">Technical data</strong> — IP address, device and
                browser information, and error logs. Used for security, fraud prevention and fixing
                faults. Legal basis: legitimate interests in keeping the service working and safe.
              </li>
              <li>
                <strong className="text-foreground">Support messages</strong> — anything you email us.
                Used to answer you. Legal basis: legitimate interests.
              </li>
            </ul>
            <p>
              We do not sell your data, and we do not use your study content for advertising.
            </p>
          </Section>

          <Section title="Who we share it with">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Hosting, database and authentication providers who store and serve the app on our
                behalf.
              </li>
              <li>Our AI provider, to generate tutoring and marking responses.</li>
              <li>
                Paddle.com, our Merchant of Record, for the sale of the product, payments, invoicing
                and tax compliance. Paddle collects your payment details directly; we never see your
                card number.
              </li>
              <li>Professional advisers (legal, accounting) where needed.</li>
              <li>Authorities, where we are required to by law.</li>
            </ul>
          </Section>

          <Section title="International transfers">
            <p>
              Our providers may process data in the United States and other countries. Where data
              leaves the UK or EEA, transfers are protected by standard contractual clauses or an
              adequacy decision.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p>
              We keep your account and study data for as long as your account exists. If you ask us
              to delete your account, we delete or anonymise your data, except where we must keep
              records (for example purchase and tax records) for the period the law requires. You can
              export your own copy at any time from the Study record page.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              Depending on where you live, you may ask us to give you a copy of your data, correct
              it, delete it, restrict or object to how we use it, or provide it in a portable format.
              Where we rely on consent, you can withdraw it at any time. Email{" "}
              <a className="underline" href="mailto:boleydavid7@outlook.com">
                boleydavid7@outlook.com
              </a>{" "}
              and we will reply within one month. If you are in the UK or EEA you also have the right
              to complain to your local data protection authority.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We use appropriate technical and organisational measures, including encryption in
              transit, access controls and per-user database rules so that your study data is only
              readable by your own account. No system is perfectly secure, so please use a strong,
              unique password.
            </p>
          </Section>

          <Section title="Cookies and local storage">
            <p>
              IT PATH uses only essential cookies and browser storage: they keep you signed in and
              hold an offline copy of your study progress so the app works without a connection. We do
              not use advertising or tracking cookies. Clearing your browser storage signs you out and
              removes the local copy; anything already backed up to your account is restored when you
              sign back in.
            </p>
          </Section>

          <Section title="Children">
            <p>
              IT PATH is not directed at children under 13, and we do not knowingly collect their
              data. If you believe a child has created an account, email us and we will remove it.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If we update this notice we will change the date at the top of this page and, for
              significant changes, tell you in the app.
            </p>
          </Section>
        </div>
      </Panel>
    </div>
  );
}
