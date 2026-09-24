import { cn } from "@/lib/utils";

export type TopicTab = "overview" | "resources" | "objectives" | "notes";

export function TopicSubnav({ activeTab, onTabChange, notesCount = 0 }: { activeTab: TopicTab; onTabChange: (tab: TopicTab) => void; notesCount?: number }) {
  const tabs: Array<{ id: TopicTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "resources", label: "Resources" },
    { id: "objectives", label: "Objectives" },
    { id: "notes", label: "Notes" },
  ];
  return (
    <nav aria-label="Topic sections" className="mb-4 flex items-center gap-1 overflow-x-auto rounded-full border border-border/70 bg-card/60 p-1">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" aria-current={activeTab === tab.id ? "page" : undefined} onClick={() => onTabChange(tab.id)} className={cn("min-h-9 shrink-0 flex-1 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", activeTab === tab.id ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground")}>
          {tab.label}{tab.id === "notes" && notesCount > 0 ? <span className="ml-1">({notesCount})</span> : null}
        </button>
      ))}
    </nav>
  );
}
