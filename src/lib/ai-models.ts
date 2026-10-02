/**
 * Central model choices for every AI call in the app.
 *
 * All app AI runs on Google Gemini with the server's GEMINI_API_KEY, so the
 * model is chosen once here rather than being repeated at each call site.
 *
 * Two tiers:
 *  - CHEAP: short structured jobs where accuracy is easy to verify.
 *  - CAPABLE: tutoring and marking, where a missed nuance costs the learner.
 *    Side-by-side testing showed the cheap tier omitting key exam points
 *    (e.g. that APIPA assigns no default gateway) and marking too leniently.
 */

/** Cheapest chat model. */
const CHEAP_MODEL = "gemini-3.5-flash-lite";

/** Stronger model reserved for complex, learner-facing reasoning. */
const CAPABLE_MODEL = "gemini-3.5-flash";

/** Conversational tutoring. */
export const TUTOR_MODEL = CAPABLE_MODEL;

/** Marking written answers. */
export const GRADING_MODEL = CAPABLE_MODEL;

/** Short structured jobs: self-checks, extraction, search, scenario writing. */
export const UTILITY_MODEL = CHEAP_MODEL;

/** Gemini's OpenAI-compatible chat endpoint; authenticate with the Gemini API key as a bearer token. */
export const GATEWAY_CHAT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

