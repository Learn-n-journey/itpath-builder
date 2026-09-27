export interface GeminiFactFinding {
  claim: string;
  problem: string;
  correction: string;
}

export interface GeminiFactCheckResult {
  ok: boolean;
  findings: GeminiFactFinding[];
  model: string | null;
  error?: string;
}

const MODEL = process.env.GEMINI_FACT_CHECK_MODEL?.trim() || "gemini-2.5-flash-lite";

function parseFindings(text: string): GeminiFactFinding[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Gemini returned non-JSON output.");
  const parsed = JSON.parse(text.slice(start, end + 1)) as { findings?: unknown };
  if (!Array.isArray(parsed.findings)) return [];
  return parsed.findings.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const finding = item as Record<string, unknown>;
    if (typeof finding.claim !== "string" || typeof finding.problem !== "string") return [];
    return [{
      claim: finding.claim.trim(),
      problem: finding.problem.trim(),
      correction: typeof finding.correction === "string" ? finding.correction.trim() : "",
    }];
  });
}

export async function checkFactsWithGemini(input: {
  topic: string;
  text: string;
  chunk: number;
  chunks: number;
}): Promise<GeminiFactCheckResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { ok: false, findings: [], model: null, error: "GEMINI_API_KEY is not configured on the server." };

  const prompt = [
    "You are an independent senior technical fact checker reviewing educational material before publication.",
    "Identify factual errors, obsolete technical claims presented as current, incorrect protocol/port/standard behavior, wrong commands or paths, and internally contradictory technical claims.",
    "Do not rewrite for style. Do not flag preferences, true simplifications, or claims you are merely uncertain about.",
    "You are not told whether the lesson contains an error. Decide independently.",
    'Return JSON only: {"findings":[{"claim":"exact or concise offending claim","problem":"why it is factually wrong","correction":"concise corrected fact"}]}.',
    "Return an empty findings array when no factual error is found.",
    "",
    `Topic: ${input.topic}`,
    `Lesson chunk ${input.chunk} of ${input.chunks}:`,
    "",
    input.text,
  ].join("\n");

  let lastError = "Gemini fact check failed.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(45_000),
        },
      );
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        lastError = `Gemini HTTP ${response.status}: ${detail || response.statusText}`;
        if (response.status === 429 || response.status >= 500) continue;
        break;
      }
      const body = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      return { ok: true, findings: parseFindings(text), model: MODEL };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Gemini fact check failed.";
    }
  }
  return { ok: false, findings: [], model: MODEL, error: lastError };
}
