/**
 * Central model choices for every AI call in the app.
 *
 * All app AI runs through the Lovable AI gateway and is billed in credits, so
 * the model is chosen once here rather than being repeated at each call site.
 *
 * Two tiers:
 *  - CHEAP: short structured jobs where accuracy is easy to verify.
 *  - CAPABLE: tutoring and marking, where a missed nuance costs the learner.
 *    Side-by-side testing showed the cheap tier omitting key exam points
 *    (e.g. that APIPA assigns no default gateway) and marking too leniently.
 */

/** Cheapest chat model on the gateway. */
const CHEAP_MODEL = "google/gemini-3.1-flash-lite";

/** Stronger model reserved for complex, learner-facing reasoning. */
const CAPABLE_MODEL = "google/gemini-3.8-flash";

/** Conversational tutoring. */
export const TUTOR_MODEL = CAPABLE_MODEL;

/** Marking written answers. */
export const GRADING_MODEL = CAPABLE_MODEL;

/** Short structured jobs: self-checks, extraction, search, scenario writing. */
export const UTILITY_MODEL = CHEAP_MODEL;

export const GATEWAY_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

