/**
 * Normalize a raw auditory string like "315-1 к." / " 605а-4 к. " / "315-1"
 * into a stable key "315-1". Kept identical between crawler and mobile client
 * so lookups always match.
 *
 * Rules:
 * - Trim whitespace and collapse repeated spaces.
 * - Drop the trailing " к." / " к" / " корп." building marker.
 * - Lowercase (Cyrillic-safe).
 */
export function normalizeAuditoryName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*(к\.?|корп\.?)\s*$/i, '')
    .trim()
    .toLowerCase();
}
