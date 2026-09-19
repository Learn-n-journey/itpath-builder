import { createServerFn } from "@tanstack/react-start";

import { SUBJECT_COOKIE } from "@/lib/subject-cookie";

/**
 * The subject key this request carries, read from the cookie the browser sets
 * when a course is chosen in settings. Null means the default course.
 */
export const getRequestSubject = createServerFn({ method: "GET" }).handler(async () => {
  const { getCookie } = await import("@tanstack/react-start/server");
  return getCookie(SUBJECT_COOKIE) ?? null;
});
