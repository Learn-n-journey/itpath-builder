import { useState } from "react";
import { Calculator, Eye } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import type { WorkedExample } from "@/data/worked-examples";

/** Step-by-step demonstrations plus practice items with hidden answers. */
export function WorkedExamples({
  examples,
  title = "Worked examples",
  description = "Each calculation is shown one step at a time, then you try it yourself before revealing the answer.",
}: {
  examples: WorkedExample[];
  title?: string;
  description?: string;
}) {
  if (examples.length === 0) return null;

  return (
    <Panel title={title} description={description}>
      <div className="space-y-6">
        {examples.map((example) => (
          <ExampleBlock key={example.id} example={example} />
        ))}
      </div>
    </Panel>
  );
}

function ExampleBlock({ example }: { example: WorkedExample }) {
  return (
    <section className="rounded-lg border border-border bg-secondary/20 p-4">
      <div className="flex items-start gap-3">
        <Calculator aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">{example.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{example.question}</p>
          </div>

          <ol className="space-y-3 border-l border-border pl-4">
            {example.steps.map((step) => (
              <li key={step.label} className="text-sm">
                <span className="font-medium text-foreground">{step.label}</span>
                <span className="mt-0.5 block text-muted-foreground">{step.detail}</span>
              </li>
            ))}
          </ol>

          <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            <span className="font-medium text-foreground">Answer: </span>
            <span className="text-muted-foreground">{example.answer}</span>
          </p>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">Now you try</h4>
            <ul className="space-y-2">
              {example.tryIt.map((item) => (
                <PracticeRow key={item.prompt} prompt={item.prompt} answer={item.answer} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PracticeRow({ prompt, answer }: { prompt: string; answer: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <li className="rounded-md border border-border bg-background/40 p-3">
      <p className="text-sm text-muted-foreground">{prompt}</p>
      {revealed ? (
        <p className="mt-2 text-sm font-medium text-primary">{answer}</p>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => setRevealed(true)}
        >
          <Eye aria-hidden /> Show answer
        </Button>
      )}
    </li>
  );
}
