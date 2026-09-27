import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cpu, ShieldCheck, Zap } from "lucide-react";
import { useEffect } from "react";

import { ByteBreak } from "@/components/game/byte-break";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/byte-break")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "BYTE//BREAK | IT PATH" },
      { name: "description", content: "BYTE//BREAK, a systems-matching arcade game inside IT PATH." },
    ],
  }),
  component: Page,
});

function Page() {
  useEffect(() => {
    document.documentElement.classList.add("byte-break-active");
    return () => document.documentElement.classList.remove("byte-break-active");
  }, []);

  return (
    <main className="byte-break-screen fixed inset-0 z-[100] overflow-hidden overscroll-none">
      <div className="byte-break-grid" aria-hidden />
      <div className="byte-break-ambient byte-break-ambient-a" aria-hidden />
      <div className="byte-break-ambient byte-break-ambient-b" aria-hidden />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1500px] flex-col px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-[max(.5rem,env(safe-area-inset-top))] sm:px-4">
        <header className="byte-break-commandbar mb-2 flex items-center justify-between gap-3 rounded-xl border border-cyan-400/35 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0 rounded-xl border border-border/50 bg-background/25" aria-label="Exit BYTE//BREAK">
              <Link to="/dashboard"><ArrowLeft className="size-4" /></Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="byte-break-live-dot" aria-hidden />
                <p className="truncate font-mono text-[9px] font-semibold uppercase tracking-[.28em] text-cyan-300">IT PATH // SYSTEM ARCADE</p>
              </div>
              <h1 className="truncate font-display text-xl font-black italic tracking-[-.04em] sm:text-3xl">BYTE<span className="text-cyan-400">//</span>BREAK</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="byte-break-system-chip"><Cpu className="size-3.5" /> SYSTEM ONLINE</span>
            <span className="byte-break-system-chip"><ShieldCheck className="size-3.5" /> CORE SECURE</span>
            <span className="byte-break-system-chip is-hot"><Zap className="size-3.5" /> OVERCLOCK READY</span>
          </div>
        </header>

        <section className="byte-break-stage min-h-0 flex flex-1 items-start justify-center overflow-y-auto overscroll-contain rounded-xl border border-cyan-400/20 p-1.5 sm:p-3">
          <ByteBreak />
        </section>
      </div>
    </main>
  );
}
