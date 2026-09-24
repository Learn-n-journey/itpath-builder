import { ArrowRight, BookOpen, Edit3, FileText, Link2, PlayCircle, Trophy, Video } from "lucide-react";

const items = [
  { label: "Learn It", subtitle: "Read and understand", target: "#read-it", icon: BookOpen },
  { label: "See It", subtitle: "Watch it in action", target: "#see-it", icon: PlayCircle },
  { label: "Read It", subtitle: "Go deeper", target: "#read-more", icon: FileText },
  { label: "Watch It", subtitle: "Video lesson", target: "#watch-it", icon: Video },
  { label: "Practice It", subtitle: "Test your knowledge", target: "#try-it", icon: Edit3 },
  { label: "Prove It", subtitle: "Take the quiz", target: "#prove-it", icon: Trophy },
] as const;

export function TopicQuickLinks({ availableTargets }: { availableTargets?: Set<string> }) {
  const visible = availableTargets ? items.filter((item) => availableTargets.has(item.target)) : items;
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 flex items-center gap-2 font-display text-base font-semibold text-foreground"><Link2 className="size-4 text-primary" aria-hidden />Quick links</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {visible.map(({ label, subtitle, target, icon: Icon }) => (
          <a key={label} href={target} className="group flex min-h-[76px] flex-col justify-between rounded-xl border border-border/70 bg-card/80 p-3 text-left transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center"><Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden /><ArrowRight className="ml-auto size-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden /></div>
            <div><p className="text-xs font-semibold text-foreground">{label}</p><p className="truncate text-[11px] text-muted-foreground">{subtitle}</p></div>
          </a>
        ))}
      </div>
    </section>
  );
}
