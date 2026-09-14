import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/topics/")({
  staticData: { sitemap: false },
  beforeLoad: () => {
    throw redirect({ to: "/learn" });
  },
});
