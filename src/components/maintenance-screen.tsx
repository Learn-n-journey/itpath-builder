import { Wrench } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { domain } from "@/domain/active";
import { activeDomainKey } from "@/lib/active-domain";
import { loadMaintenanceState } from "@/lib/maintenance-state";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { useAuth } from "@/state/auth-state";

/** Paths that stay reachable while a course is closed for maintenance. */
const ALWAYS_OPEN = ["/", "/auth", "/settings", "/reset-password"];

function MaintenanceScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md">
        <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-lg border border-border bg-card text-primary">
          <Wrench className="size-6" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold">{domain.appName} is under maintenance</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We are making improvements to this course. Your progress is safe and nothing has been
          lost. Please check back shortly.
        </p>
        <Button className="mt-7" onClick={() => window.location.assign("/")}>
          Back to course selection
        </Button>
      </div>
    </main>
  );
}

/** Shows the maintenance screen instead of the app when this course is closed. */
export function MaintenanceGate({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { email } = useAuth();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadMaintenanceState().then((state) => {
      if (!alive) return;
      const id = activeDomainKey().split("@")[0] ?? "";
      setClosed(state[id] === true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const isOwner = OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
  if (closed && !isOwner && !ALWAYS_OPEN.includes(pathname)) return <MaintenanceScreen />;
  return <>{children}</>;
}
