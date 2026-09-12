import { BookOpen, MapPin } from "lucide-react";

import { Panel } from "@/components/page-kit";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { DeepLesson } from "@/data/deep-lessons";

/**
 * The main reading for a topic, broken into numbered parts so a beginner can
 * work through one idea at a time instead of facing a wall of text.
 */
export function DeepLessonReading({ lesson }: { lesson: DeepLesson }) {
  return (
    <div className="space-y-4">
      <Panel title="Start here" description={`About ${lesson.readingMinutes} minutes of reading, in ${lesson.sections.length} short parts.`}>
        <div className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p className="flex gap-3">
            <BookOpen aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
            <span>{lesson.intro}</span>
          </p>
          <p className="flex gap-3">
            <MapPin aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="font-medium text-foreground">Where you meet it: </span>
              {lesson.whereYouMeetIt}
            </span>
          </p>
        </div>
      </Panel>

      <Panel
        title="The lesson, part by part"
        description="Open one part at a time. Each part stands on its own, so you can stop and come back."
      >
        <Accordion
          type="multiple"
          defaultValue={lesson.sections.slice(0, 1).map((_, index) => `part-${index}`)}
          className="w-full"
        >
          {lesson.sections.map((section, index) => (
            <AccordionItem key={section.heading} value={`part-${index}`}>
              <AccordionTrigger className="text-left">
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="font-mono text-xs text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium">{section.heading}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets && section.bullets.length > 0 ? (
                    <ul className="space-y-2">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Panel>
    </div>
  );
}
