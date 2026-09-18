/**
 * Originality check API.
 *
 * Give it markdown and it reports how much of it already appears in the
 * published curriculum, and how much matches any protected text you paste in
 * (exam objectives, a vendor's wording). Nothing is sent to an outside
 * service: the comparison is plain word-run matching.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { lessons, topics } from "@/data/static-content";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildReference, checkOriginality, type OriginalityResult } from "@/lib/originality";

const schema = z.object({
  markdown: z.string().min(40).max(200000),
  /** Optional protected wording the text must not mirror. */
  protectedText: z.string().max(200000).optional(),
  threshold: z.number().min(0.01).max(0.9).optional(),
});

export interface OriginalityReport {
  againstCurriculum: OriginalityResult;
  againstProtected: OriginalityResult | null;
  verdict: "clear" | "review";
}

export type OriginalityReply = { ok: true; report: OriginalityReport } | { ok: false; error: string };

function curriculumCorpus(): string[] {
  return topics.map((topic) => {
    const lesson = lessons.find((item) => item.topicId === topic.id);
    if (!lesson) return topic.summary;
    return [
      lesson.body,
      lesson.definition,
      lesson.whyItMatters,
      lesson.summary,
      ...lesson.realWorldExamples,
      ...lesson.commonMisconceptions,
    ].join("\n");
  });
}

export const checkMarkdownOriginality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }): Promise<OriginalityReply> => {
    const threshold = data.threshold ?? 0.2;

    const againstCurriculum = checkOriginality(data.markdown, buildReference(curriculumCorpus()), { threshold });
    const againstProtected = data.protectedText?.trim()
      ? // Copied exam wording is a harder line, so it is flagged much sooner.
        checkOriginality(data.markdown, buildReference([data.protectedText]), { threshold: 0.05 })
      : null;

    return {
      ok: true,
      report: {
        againstCurriculum,
        againstProtected,
        verdict: againstCurriculum.flagged || againstProtected?.flagged ? "review" : "clear",
      },
    };
  });
