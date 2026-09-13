import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addBetaTester,
  listBetaTesters,
  removeBetaTester,
  type BetaTester,
} from "@/lib/beta-access.functions";
import { useAuth } from "@/state/auth-state";

/**
 * Owner-only panel for managing the free-access (beta) list.
 * Non-owners never see it: the server function reports owner: false.
 */
export function BetaAccessPanel() {
  const { userId, ready } = useAuth();
  const list = useServerFn(listBetaTesters);
  const add = useServerFn(addBetaTester);
  const remove = useServerFn(removeBetaTester);

  const [owner, setOwner] = useState(false);
  const [testers, setTesters] = useState<BetaTester[]>([]);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !userId) {
      setOwner(false);
      return;
    }
    let active = true;
    void list({}).then((reply) => {
      if (!active || !reply.ok) return;
      setOwner(reply.owner);
      setTesters(reply.testers);
    });
    return () => {
      active = false;
    };
  }, [ready, userId, list]);

  if (!owner) return null;

  async function submit() {
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    const reply = await add({ data: { email: value, note: note.trim() || undefined } });
    setBusy(false);
    if (!reply.ok) {
      toast.error(reply.error);
      return;
    }
    setTesters(reply.testers);
    setEmail("");
    setNote("");
    toast.success(`${value} now has full access.`);
  }

  async function drop(target: string) {
    setBusy(true);
    const reply = await remove({ data: { email: target } });
    setBusy(false);
    if (!reply.ok) {
      toast.error(reply.error);
      return;
    }
    setTesters(reply.testers);
    toast.success(`${target} no longer has free access.`);
  }

  return (
    <Panel
      className="mt-4"
      title="Free access list"
      description="Accounts on this list get everything without paying. Only you can see or change it."
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div>
          <Label htmlFor="beta-email">Email address</Label>
          <Input
            id="beta-email"
            type="email"
            className="mt-1.5"
            placeholder="tester@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="beta-note">Note (optional)</Label>
          <Input
            id="beta-note"
            className="mt-1.5"
            placeholder="Beta tester"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button type="button" disabled={busy || !email.trim()} onClick={() => void submit()}>
          {busy ? "Saving…" : "Add"}
        </Button>
      </div>

      <ul className="mt-5 divide-y divide-border rounded-md border border-border">
        {testers.length === 0 ? (
          <li className="p-3 text-sm text-muted-foreground">Nobody on the list yet.</li>
        ) : (
          testers.map((tester) => (
            <li
              key={tester.email}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{tester.email}</p>
                {tester.note ? (
                  <p className="truncate text-xs text-muted-foreground">{tester.note}</p>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void drop(tester.email)}
              >
                Remove
              </Button>
            </li>
          ))
        )}
      </ul>
    </Panel>
  );
}
