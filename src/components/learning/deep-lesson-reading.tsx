import { BookOpen, MapPin, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Panel } from "@/components/page-kit";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { DeepLesson } from "@/data/deep-lessons";
import { lessonPartAnchor } from "@/lib/lesson-anchor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contentFingerprint, deepSectionId, lessonConceptAnchor } from "@/lib/lesson-concepts";
import { useAppState } from "@/state/app-state";

/**
 * The main reading for a topic, broken into numbered parts so a beginner can
 * work through one idea at a time instead of facing a wall of text.
 */
export function DeepLessonReading({ lesson }: { lesson: DeepLesson }) {
  const { user, actions } = useAppState();
  const saved = user.readingPositions[lesson.topicId];
  const savedRef = useRef(saved);
  const [hashPresent, setHashPresent] = useState(false);
  const fingerprint = useMemo(() => contentFingerprint(lesson), [lesson]);
  const sectionIds = useMemo(() => lesson.sections.map((section) => deepSectionId(lesson.topicId, section)), [lesson]);
  // Controlled so a search hit (or any #lesson-part anchor) can open the right part.
  const [openParts, setOpenParts] = useState<string[]>(() =>
    lesson.sections.slice(0, 1).map((section) => deepSectionId(lesson.topicId, section)),
  );
  const activeId = useRef(sectionIds[0] ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savePosition = useCallback((sectionId = activeId.current) => {
    const element = document.getElementById(lessonConceptAnchor(sectionId));
    if (!element || !sectionIds.includes(sectionId)) return;
    const rect = element.getBoundingClientRect();
    const offset = Math.max(0, Math.min(1, (96 - rect.top) / Math.max(rect.height, 1)));
    const reviewed = new Set(savedRef.current?.reviewedSectionIds ?? []);
    reviewed.add(sectionId);
    actions.setReadingPosition({ topicId: lesson.topicId, sectionId, offset, contentFingerprint: fingerprint, updatedAt: new Date().toISOString(), reviewedSectionIds: [...reviewed] });
  }, [actions, fingerprint, lesson.topicId, sectionIds]);

  const scheduleSave = useCallback((sectionId: string) => {
    activeId.current = sectionId;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => savePosition(sectionId), 1400);
  }, [savePosition]);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    setHashPresent(Boolean(window.location.hash));
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const index = lesson.sections.findIndex((section) => lessonPartAnchor(section.heading) === hash || lessonConceptAnchor(deepSectionId(lesson.topicId, section)) === hash);
    if (index === -1) return;
    const sectionId = sectionIds[index];
    if (!sectionId) return;
    setOpenParts((current) => (current.includes(sectionId) ? current : [...current, sectionId]));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
    const onHashChange = () => {
      const next = window.location.hash.replace("#", "");
      const found = lesson.sections.find((section) => lessonPartAnchor(section.heading) === next || lessonConceptAnchor(deepSectionId(lesson.topicId, section)) === next);
      if (!found) return;
      const id = deepSectionId(lesson.topicId, found);
      setOpenParts((current) => current.includes(id) ? current : [...current, id]);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("hashchange", onHashChange); };
  }, [lesson, sectionIds]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => Math.abs(a.boundingClientRect.top - 96) - Math.abs(b.boundingClientRect.top - 96))[0];
      const sectionId = visible?.target.getAttribute("data-lesson-section-id");
      if (sectionId) scheduleSave(sectionId);
    }, { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.2] });
    sectionIds.forEach((id) => { const element = document.getElementById(lessonConceptAnchor(id)); if (element) observer.observe(element); });
    const flush = () => savePosition();
    const hidden = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => { observer.disconnect(); if (timer.current) clearTimeout(timer.current); flush(); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", hidden); };
  }, [savePosition, scheduleSave, sectionIds]);

  function resume() {
    if (!saved || window.location.hash) return;
    const exact = sectionIds.includes(saved.sectionId) ? saved.sectionId : sectionIds[0];
    if (!exact) return;
    setOpenParts((current) => current.includes(exact) ? current : [...current, exact]);
    window.requestAnimationFrame(() => {
      const element = document.getElementById(lessonConceptAnchor(exact));
      if (!element) return;
      const offset = saved.contentFingerprint === fingerprint ? saved.offset : 0;
      window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 88 + element.offsetHeight * offset, behavior: "smooth" });
    });
  }

  return (
    <div className="space-y-4">
      <Panel title="Start here" description={`Read it at your own pace, in ${lesson.sections.length} short parts.`}>
        <div className="space-y-4 text-sm leading-7 text-muted-foreground">
          {lesson.plain ? (
            <p className="rounded-lg border border-border/70 bg-secondary/25 p-4 text-foreground">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                In plain words
              </span>
              {lesson.plain.plainIntro}
            </p>
          ) : null}
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
        {saved && !hashPresent ? <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/25 p-3"><p className="text-sm text-muted-foreground">Continue at {lessonConceptSectionsLabel(saved.sectionId, lesson)}.</p><Button size="sm" variant="outline" onClick={resume}><Play aria-hidden />Continue where you left off</Button></div> : null}
        <Accordion
          type="multiple"
          value={openParts}
          onValueChange={(values) => { setOpenParts(values); const latest = values.find((value) => !openParts.includes(value)); if (latest) savePosition(latest); }}
          className="w-full"
        >
          {lesson.sections.map((section, index) => {
            const sectionId = deepSectionId(lesson.topicId, section);
            const reviewed = saved?.reviewedSectionIds?.includes(sectionId) ?? false;
            return (
            <AccordionItem
              key={sectionId}
              value={sectionId}
              id={lessonConceptAnchor(sectionId)}
              data-lesson-section-id={sectionId}
              className="scroll-mt-24"
            >
              <AccordionTrigger className="text-left">
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="font-mono text-xs text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium">{section.heading}</span>
                  <Badge variant="outline" className="ml-auto shrink-0">{reviewed ? "Reviewed" : `Part ${index + 1} of ${lesson.sections.length}`}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 text-sm leading-7 text-muted-foreground">
                  <span id={lessonPartAnchor(section.heading)} className="block scroll-mt-24" aria-hidden />
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
          );})}
        </Accordion>
      </Panel>
    </div>
  );
}

function lessonConceptSectionsLabel(sectionId: string, lesson: DeepLesson): string {
  const section = lesson.sections.find((item) => deepSectionId(lesson.topicId, item) === sectionId);
  return section?.heading ?? "the beginning";
}
