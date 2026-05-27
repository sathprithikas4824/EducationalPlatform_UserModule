/** Strip HTML tags and dangerous patterns from user-typed text. Prevents XSS. */
export function sanitiseText(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")       // remove all HTML tags
    .replace(/javascript\s*:/gi, "") // remove javascript: protocol
    .replace(/on\w+\s*=/gi, "")     // remove onerror=, onclick=, etc.
    .trim();
}

/** Sanitise every string value in a plain object (used for survey answers). */
export function sanitiseObject(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    clean[key] = typeof value === "string" ? sanitiseText(value) : value;
  }
  return clean;
}
