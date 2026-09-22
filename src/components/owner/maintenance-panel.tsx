import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setMaintenance } from "@/lib/maintenance.functions";
import { loadMaintenanceState } from "@/lib/maintenance-state";

/** Owner-only switch that closes a course while work is going on. */
export function MaintenancePanel() {
  const toggle = useServerFn(setMaintenance);
  const [state, setState] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void loadMaintenanceState().then(setState);
  }, []);

  async function flip(domainId: "it-cybersecurity" | "auto-repair", label: string) {
    const next = !state[domainId];
    setBusy(domainId);
    try {
      const result = await toggle({ data: { domain: domainId, enabled: next } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setState(result.state);
      toast.success(next ? `${label} is now under maintenance.` : `${label} is open again.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not save.");
    } finally {
      setBusy(null);
    }
  }

  const courses: { id: "it-cybersecurity" | "auto-repair"; label: string }[] = [
    { id: "it-cybersecurity", label: "IT PATH" },
    { id: "auto-repair", label: "AUTO PATH" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {courses.map((course) => (
        <Button
          key={course.id}
          variant={state[course.id] ? "destructive" : "secondary"}
          disabled={busy !== null}
          onClick={() => flip(course.id, course.label)}
        >
          {state[course.id]
            ? `${course.label}: maintenance on`
            : `${course.label}: maintenance off`}
        </Button>
      ))}
    </div>
  );
}
