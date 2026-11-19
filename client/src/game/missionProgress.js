// Mission progress maths, kept out of the UI.
//
// `visitedZones` (a list of zone IDs) is the single source of truth. Progress
// is always derived from that list, never stored independently, so duplicate
// discoveries cannot inflate it and a restored session cannot disagree with
// the progress bar.

import { ZONE_IDS, ZONES } from "./zones.js";

export const POINTS_PER_ZONE = 100 / ZONE_IDS.length;
export const MAX_PROGRESS = 100;

/** Keeps only known zone IDs, de-duplicated, in the canonical zone order. */
export function normalizeVisitedZones(zoneIds) {
  const known = new Set(Array.isArray(zoneIds) ? zoneIds : []);
  return ZONE_IDS.filter((id) => known.has(id));
}

/** Union of several zone-ID lists (local state + server state). */
export function mergeVisitedZones(...lists) {
  return normalizeVisitedZones(lists.flat());
}

/** 0, 20, 40, 60, 80 or 100 — never above 100. */
export function calculateProgress(zoneIds) {
  const unique = normalizeVisitedZones(zoneIds);
  return Math.min(MAX_PROGRESS, Math.round(unique.length * POINTS_PER_ZONE));
}

/** Everything the mission card needs, derived in one pass. */
export function getMissionSummary(zoneIds) {
  return summarizeMission(ZONES, zoneIds);
}

/**
 * Same summary for any zone list. Mission 002 (coastal) has its own zones and
 * its own progress store, so it must not go through the classroom ZONE_IDS.
 */
export function summarizeMission(zones, zoneIds) {
  const known = new Set(Array.isArray(zoneIds) ? zoneIds : []);
  const explored = zones.filter((zone) => known.has(zone.id));
  const remaining = zones.filter((zone) => !known.has(zone.id));

  return {
    explored,
    remaining,
    visitedCount: explored.length,
    totalCount: zones.length,
    progress:
      zones.length === 0 ? 0 : Math.min(MAX_PROGRESS, Math.round((explored.length / zones.length) * MAX_PROGRESS)),
    isComplete: zones.length > 0 && explored.length === zones.length,
  };
}
