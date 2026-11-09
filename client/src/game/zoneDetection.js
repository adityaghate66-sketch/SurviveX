// Pure zone-detection helpers.
//
// These functions know nothing about React, Three.js or the player component —
// they only take a position-like object ({ x, z }) and return zone data. That
// keeps the geometry easy to test and lets the same logic be reused later (for
// example by a minimap or by the backend-driven mission state).

import { ZONES } from "./zones.js";

/**
 * True when a position lies inside a zone's floor rectangle.
 * The y coordinate is ignored: zones are floor areas, not boxes.
 */
export function isInsideZone(zone, position) {
  if (!zone || !position) return false;
  const { minX, maxX, minZ, maxZ } = zone.bounds;
  return (
    position.x >= minX &&
    position.x <= maxX &&
    position.z >= minZ &&
    position.z <= maxZ
  );
}

/**
 * Returns the zone containing the position, or null when the player is in an
 * aisle that no zone covers.
 */
export function findZoneAtPosition(position, zones = ZONES) {
  return zones.find((zone) => isInsideZone(zone, position)) ?? null;
}

export function getZoneById(zoneId, zones = ZONES) {
  return zones.find((zone) => zone.id === zoneId) ?? null;
}
