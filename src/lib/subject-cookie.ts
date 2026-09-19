/**
 * The chosen subject, in a form the server can also read.
 *
 * The device choice lives in localStorage, which only the browser can see, so
 * the first HTML of a page load was always built as the default subject. The
 * same choice is mirrored into this cookie purely so the server can tell, at
 * request time, that this visitor is not on the default course.
 */
export const SUBJECT_COOKIE = "itpath.active-domain";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The cookie value in the browser, or null when none is set. */
export function readSubjectCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SUBJECT_COOKIE}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Mirror the choice into the cookie, or clear it when back on the default. */
export function writeSubjectCookie(key: string | null): void {
  if (typeof document === "undefined") return;
  const base = `path=/; SameSite=Lax`;
  document.cookie = key
    ? `${SUBJECT_COOKIE}=${encodeURIComponent(key)}; ${base}; max-age=${ONE_YEAR_SECONDS}`
    : `${SUBJECT_COOKIE}=; ${base}; max-age=0`;
}
