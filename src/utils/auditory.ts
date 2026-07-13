/**
 * Normalize a raw auditory string like "315-1 к." / " 605а-4 к. " / "315-1"
 * into a stable key "315-1". Must stay in sync with the crawler at
 * `services/auditory-api/src/normalize.ts` — lookups match only if both sides
 * produce identical keys.
 */
export function normalizeAuditoryName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*(к\.?|корп\.?)\s*$/i, '')
    .trim()
    .toLowerCase();
}

/**
 * Extract the first meaningful auditory key from a lesson's `auditories` array.
 * Skips empty strings and returns null when nothing usable is present.
 */
export function pickAuditoryKey(auditories: readonly string[] | null | undefined): string | null {
  if (!auditories || auditories.length === 0) return null;
  for (const raw of auditories) {
    const key = normalizeAuditoryName(raw);
    if (key) return key;
  }
  return null;
}
