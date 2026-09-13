import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/topics/")({
  beforeLoad: () => {
    throw redirect({ to: "/learn" });
  },
});
