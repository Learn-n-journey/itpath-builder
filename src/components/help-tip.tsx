import { useState } from "react";
import { CircleHelp } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** A small "?" that reveals extra context on tap, click or desktop hover. */
export function HelpTip({ children, label = "More about this" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CircleHelp aria-hidden className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="max-w-xs text-sm leading-6 text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}
