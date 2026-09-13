import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navItems } from "@/config/navigation";
import { certifications, labs, topics } from "@/data/static-content";

interface PaletteEntry {
  id: string;
  label: string;
  hint: string;
  go: () => void;
}

/**
 * Quick search over every page, topic, certification and lab.
 * Opens with Ctrl/Cmd+K or the search button in the sidebar.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const groups = useMemo(() => {
    const run = (fn: () => void) => () => {
      onOpenChange(false);
      fn();
    };
    const pages: PaletteEntry[] = navItems.map((item) => ({
      id: `page-${item.to}`,
      label: item.label,
      hint: item.description,
      go: run(() => void navigate({ to: item.to })),
    }));
    const topicEntries: PaletteEntry[] = topics.map((topic) => ({
      id: `topic-${topic.id}`,
      label: topic.title,
      hint: topic.summary ?? "Topic lesson",
      go: run(() => void navigate({ to: "/topics/$topicId", params: { topicId: topic.id } })),
    }));
    const certEntries: PaletteEntry[] = certifications.map((certification) => ({
      id: `cert-${certification.id}`,
      label: certification.title,
      hint: certification.provider,
      go: run(() => void navigate({ to: "/certifications/$certId", params: { certId: certification.id } })),
    }));
    const labEntries: PaletteEntry[] = labs.slice(0, 200).map((lab) => ({
      id: `lab-${lab.id}`,
      label: lab.title,
      hint: "Hands-on lab",
      go: run(() => void navigate({ to: "/labs" })),
    }));
    return [
      { heading: "Pages", items: pages },
      { heading: "Topics", items: topicEntries },
      { heading: "Certifications", items: certEntries },
      { heading: "Labs", items: labEntries },
    ];
  }, [navigate, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search pages, topics, certifications and labs…"
      />
      <CommandList>
        <CommandEmpty>Nothing matched that search.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((entry) => (
              <CommandItem key={entry.id} value={`${entry.label} ${entry.hint}`} onSelect={entry.go}>
                <span className="truncate">{entry.label}</span>
                <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">{entry.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

/** Sidebar button that opens the palette. */
export function CommandPaletteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-sidebar-border bg-background/40 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">Search…</span>
      <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
    </button>
  );
}

/** Registers the Ctrl/Cmd+K shortcut. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
