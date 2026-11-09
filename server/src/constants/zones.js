// The five exploration zones for Mission 001.
//
// These IDs are the contract between the React client and the API. The client
// only ever sends a zone ID; the server decides how many points that is worth,
// so a tampered request cannot invent progress.

export const ZONE_IDS = Object.freeze([
  "teacher-desk",
  "student-desks",
  "windows",
  "classroom-entrance",
  "open-safe-area",
]);

export const ZONE_PERCENT = 100 / ZONE_IDS.length;
export const MAX_PROGRESS = 100;

export function isZoneId(value) {
  return typeof value === "string" && ZONE_IDS.includes(value);
}

/**
 * Keeps only known zone IDs, removes duplicates, and returns them in the
 * canonical order. Accepts array-like JSON loaded from PostgreSQL.
 */
export function normalizeZoneIds(value) {
  if (!Array.isArray(value)) return [];

  const known = new Set(value.filter(isZoneId));
  return ZONE_IDS.filter((id) => known.has(id));
}

/** Progress is always derived from unique zones, never from a client value. */
export function calculateProgress(zoneIds) {
  const unique = normalizeZoneIds(zoneIds);
  return Math.min(MAX_PROGRESS, Math.round(unique.length * ZONE_PERCENT));
}
