import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/state/auth-state";

/** Lets a signed-in learner set the first name used in the dashboard greeting. */
export function ProfileNamePanel() {
  const { userId, ready } = useAuth();
  const { firstName, loading, saveFirstName, saving } = useProfile();
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) setValue(firstName);
  }, [firstName, touched]);

  if (!ready || !userId) return null;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    try {
      await saveFirstName(value);
      setTouched(false);
      toast.success("Name saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not save. Try again.");
    }
  }

  return (
    <Panel title="Your name" description="Used to greet you on the dashboard.">
      <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="profileFirstName">First name</Label>
          <Input
            id="profileFirstName"
            type="text"
            autoComplete="given-name"
            maxLength={40}
            placeholder={loading ? "Loading…" : "e.g. David"}
            value={value}
            onChange={(e) => {
              setTouched(true);
              setValue(e.target.value);
            }}
          />
        </div>
        <Button type="submit" disabled={saving || loading}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
    </Panel>
  );
}
