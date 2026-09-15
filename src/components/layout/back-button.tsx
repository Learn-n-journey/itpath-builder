import { useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/") return null;

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    void router.navigate({ to: "/" });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={goBack}
      className={cn("-ml-2 gap-2 text-muted-foreground hover:text-foreground", className)}
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back
    </Button>
  );
}
