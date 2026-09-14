/**
 * Central model choices for every AI call in the app.
 *
 * All app AI runs through the Lovable AI gateway and is billed in credits, so
 * the model is chosen once here rather than being repeated at each call site.
 * Flash-lite is the cheapest chat model on the gateway and is enough for
 * tutoring, marking, classification and scenario writing.
 */

/** Conversational tutoring. */
export const TUTOR_MODEL = "google/gemini-3.1-flash-lite";

/** Marking written answers. */
export const GRADING_MODEL = "google/gemini-3.1-flash-lite";

/** Short structured jobs: self-checks, extraction, search, scenario writing. */
export const UTILITY_MODEL = "google/gemini-3.1-flash-lite";

export const GATEWAY_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
