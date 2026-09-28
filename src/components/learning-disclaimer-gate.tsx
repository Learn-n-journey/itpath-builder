import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

export const LEARNING_DISCLAIMER_VERSION = "1.0";

const STORAGE_KEY = "itpath_learning_disclaimer_version";
const STORAGE_AT_KEY = "itpath_learning_disclaimer_accepted_at";

function readLocalAcceptance(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function LearningDisclaimerGate({ children }: { children: ReactNode }) {
  const { user, ready, signOut } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [localAccepted, setLocalAccepted] = useState(false);

  useEffect(() => {
    setLocalAccepted(readLocalAcceptance() === LEARNING_DISCLAIMER_VERSION);
    setHydrated(true);
  }, []);

  const accountVersion = user?.user_metadata?.["learning_disclaimer_version"];
  const accountAccepted = accountVersion === LEARNING_DISCLAIMER_VERSION;

  // Carry a device acceptance up to the account once someone signs in.
  useEffect(() => {
    if (!ready || !user || accountAccepted || !localAccepted) return;
    void supabase.auth.updateUser({
      data: {
        learning_disclaimer_version: LEARNING_DISCLAIMER_VERSION,
        learning_disclaimer_accepted_at:
          (() => {
            try {
              return window.localStorage.getItem(STORAGE_AT_KEY) ?? new Date().toISOString();
            } catch {
              return new Date().toISOString();
            }
          })(),
      },
    });
  }, [ready, user, accountAccepted, localAccepted]);

  // Never block the first server-rendered paint.
  if (!hydrated) return <>{children}</>;
  if (localAccepted || accountAccepted) return <>{children}</>;

  async function accept() {
    if (!agreed || saving) return;
    setSaving(true);
    const acceptedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(STORAGE_KEY, LEARNING_DISCLAIMER_VERSION);
      window.localStorage.setItem(STORAGE_AT_KEY, acceptedAt);
    } catch {
      // Storage may be unavailable (private mode); account metadata still covers signed-in users.
    }
    if (user) {
      await supabase.auth.updateUser({
        data: {
          learning_disclaimer_version: LEARNING_DISCLAIMER_VERSION,
          learning_disclaimer_accepted_at: acceptedAt,
        },
      });
    }
    setSaving(false);
    setLocalAccepted(true);
  }

  return (
    <main className="fixed inset-0 z-[100] flex h-[100dvh] items-stretch justify-center overflow-hidden bg-background/98 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="learning-disclaimer-title">
      <section className="flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden bg-card shadow-2xl sm:h-auto sm:max-h-[94dvh] sm:rounded-xl sm:border sm:border-border">
        <header className="border-b border-border px-5 py-4 sm:px-7">
          <h1 id="learning-disclaimer-title" className="font-display text-2xl font-semibold">Before You Begin</h1>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-muted-foreground sm:px-7">
          <p className="text-foreground">IT PATH is a learning platform designed to help you learn, practice, connect with others, and enjoy building real-world skills.</p>
          <p>This platform is not intended to replace an accredited school, college, apprenticeship, trade program, instructor-led training, manufacturer training, or supervised hands-on experience. It should be used as a learning and practice resource alongside other appropriate education and experience.</p>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">How the lessons are created</h2>
            <p>Artificial intelligence is used to help develop and organize lesson content. AI-generated material is not simply generated and published automatically. Content goes through a quality-review process designed to identify problems such as inaccurate information, missing concepts, weak explanations, duplicated material, incorrect answer keys, prerequisite problems, lesson/assessment mismatches, unsupported claims, and questions that test material that was not adequately taught.</p>
            <p className="mt-3">Lessons are also reviewed by a human before being approved for use. Where appropriate, the platform includes links and references to authoritative sources, documentation, certification objectives, and additional learning resources so you can continue studying beyond the material presented here.</p>
            <p className="mt-3">Even with these safeguards, no educational resource is error-free. Technology, standards, software, vehicles, procedures, certification requirements, and industry practices can change. When performing real work, always verify important information using current official documentation, manufacturer service information, workplace procedures, applicable codes or standards, and qualified instruction when appropriate.</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">Practice and simulations</h2>
            <p>Labs, troubleshooting exercises, diagnostic simulations, quizzes, games, and other interactive activities are educational simulations. They may simplify real-world conditions to teach a particular concept. Success in a simulation does not by itself establish professional qualification or authorization to perform work.</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-foreground">Community content</h2>
            <p>Community posts and discussions may come from other learners and should not automatically be treated as verified technical advice. Use reliable documentation and qualified professional guidance when the consequences of an error could be significant.</p>
          </section>

          <p className="font-medium text-foreground">The goal is simple: learn something useful, practice it, challenge yourself, connect with other learners, and have fun doing it.</p>
        </div>

        <footer className="shrink-0 border-t border-border bg-background/95 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7 sm:pb-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-current"
            />
            <span>I understand that this platform is a supplemental learning resource and does not replace appropriate professional education, training, supervision, documentation, or safety procedures.</span>
          </label>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {user ? (
              <Button type="button" variant="outline" onClick={() => void signOut()}>
                Decline &amp; Sign Out
              </Button>
            ) : null}
            <Button type="button" disabled={!agreed || saving} onClick={() => void accept()}>
              {saving ? "Saving…" : "I Understand & Continue"}
            </Button>
          </div>
        </footer>
      </section>
    </main>
  );
}
