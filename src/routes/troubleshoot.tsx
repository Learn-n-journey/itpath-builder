import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/troubleshoot")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Troubleshoot — IT PATH" },
      { name: "description", content: "Structured troubleshooting practice and your fault log." },
      { property: "og:title", content: "Troubleshoot — IT PATH" },
      { property: "og:description", content: "Practise a repeatable IT troubleshooting method." },
    ],
  }),
  component: Troubleshoot,
});

const METHOD = [
  "Identify the problem and gather information",
  "Establish a theory of probable cause",
  "Test the theory to determine the cause",
  "Establish a plan of action",
  "Implement the solution or escalate",
  "Verify full functionality",
  "Document findings, actions and outcomes",
];

function Troubleshoot() {
  const { user } = useAppState();

  return (
    <>
      <PageHeader
        title="Troubleshoot"
        description="Scenario practice using the standard seven-step troubleshooting method."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="The method you will use every time">
          <ol className="space-y-2 text-sm text-muted-foreground">
            {METHOD.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="font-mono text-primary">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <EmptyState
          icon={Wrench}
          title="No scenarios attempted"
          body={`You have ${user.mistakes.length} logged mistakes and no troubleshooting scenarios recorded yet. Scenarios are added alongside the curriculum.`}
        />
      </div>
    </>
  );
}
