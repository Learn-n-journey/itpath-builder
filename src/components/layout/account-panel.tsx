import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CloudCheck, CloudAlert, CloudUpload, HardDrive } from "lucide-react";

import { useAuth } from "@/state/auth-state";
import { useAppStateOptional } from "@/state/app-state";
import { Button } from "@/components/ui/button";

export function AccountPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { email, userId, ready, signOut } = useAuth();
  const app = useAppStateOptional();
  const hydrated = app?.hydrated ?? false;
  const cloudStatus = app?.cloudStatus;
  const cloudError = app?.cloudError;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!hydrated || !ready) {
    return <p className="text-xs text-muted-foreground">Loading your data…</p>;
  }

  if (!userId) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <HardDrive className="size-3.5" aria-hidden />
          Saved on this device only
        </p>
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to="/auth" onClick={onNavigate}>
            Sign in to save progress
          </Link>
        </Button>
      </div>
    );
  }

  const status =
    cloudStatus === "error"
      ? { icon: CloudAlert, text: cloudError ?? "Backup failed" }
      : cloudStatus === "syncing"
        ? { icon: CloudUpload, text: "Saving to your account…" }
        : { icon: CloudCheck, text: "Backed up to your account" };
  const StatusIcon = status.icon;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    onNavigate?.();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-2">
      <p className="truncate text-xs font-medium text-foreground">{email}</p>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <StatusIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{status.text}</span>
      </p>
      <Button size="sm" variant="outline" className="w-full" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}
