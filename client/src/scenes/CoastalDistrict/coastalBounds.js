// Walkable areas and collision bounds for Coastal District 001
// Phase 1: Terrain and Geography
//
// Pure functions with no React/Three dependency so Phase 6 can reuse them for
// player collision. Phase 2 does not wire them into Player.jsx yet (that is the
// Phase 6 integration step), but the road/layout tests do use isWalkable().

import {
  WORLD_SIZE,
  COASTLINE,
  BEACH,
  HARBOR,
  RIVER,
  EVACUATION_SHELTER,
  getMeshHeight,
  getTerrainHeight,
  harborBasinFactor,
  isRiverChannel,
} from "./terrain.js";

const EDGE_BUFFER = 50;

// Hard map boundary. The player can roam this whole box.
export const WALKABLE_BOUNDS = {
  minX: -WORLD_SIZE / 2 + EDGE_BUFFER,
  maxX: WORLD_SIZE / 2 - EDGE_BUFFER,
  minZ: COASTLINE.Z_COAST + 30, // shallow surf, not deep water
  maxZ: WORLD_SIZE / 2 - EDGE_BUFFER,
};

export const OCEAN_BOUNDS = {
  minX: -WORLD_SIZE / 2,
  maxX: WORLD_SIZE / 2,
  minZ: -WORLD_SIZE / 2,
  maxZ: COASTLINE.Z_COAST - 40,
};

export const RIVER_BOUNDS = {
  width: RIVER.WIDTH,
  bankBlend: RIVER.BANK_BLEND,
  path: RIVER.PATH,
};

export const BEACH_ACCESS = {
  minX: -WORLD_SIZE / 2 + EDGE_BUFFER,
  maxX: 175, // the river mouth closes the eastern end of the beach
  minZ: COASTLINE.Z_COAST,
  maxZ: BEACH.MAX_Z,
};

export const HARBOR_BOUNDS = {
  minX: HARBOR.CENTER.x - HARBOR.WIDTH / 2,
  maxX: HARBOR.CENTER.x + HARBOR.WIDTH / 2,
  minZ: HARBOR.CENTER.z - HARBOR.DEPTH / 2,
  maxZ: HARBOR.CENTER.z + HARBOR.DEPTH / 2,
};

export const EVACUATION_BOUNDS = {
  ...EVACUATION_SHELTER,
  safeFrom: ["tsunami", "flood", "fire"],
};

export const HILL_ACCESS_ROADS = {
  mainRoad: {
    start: { x: 0, z: 120 },
    end: EVACUATION_SHELTER.LOCATION,
    width: 5,
  },
};

export function isInDeepWater(x, z) {
  return z < COASTLINE.Z_COAST;
}

export function isInHarbourWater(x, z) {
  return harborBasinFactor(x, z) > 0.55;
}

export function isInRiverWater(x, z, extra = 2) {
  return isRiverChannel(x, z, extra);
}

// Deep water, the harbour basin and the open river channel are not walkable
// (bridges are handled separately in Phase 6).
export function isWalkable(x, z) {
  if (
    x < WALKABLE_BOUNDS.minX ||
    x > WALKABLE_BOUNDS.maxX ||
    z < WALKABLE_BOUNDS.minZ ||
    z > WALKABLE_BOUNDS.maxZ
  ) {
    return false;
  }

  if (isInDeepWater(x, z)) return false;
  if (isInHarbourWater(x, z)) return false;
  if (isInRiverWater(x, z)) return false;

  return getTerrainHeight(x, z) > -0.6;
}

// Ground height for the player controller (matches the rendered mesh).
export function getWalkableHeight(x, z) {
  return getMeshHeight(x, z);
}

export function getEvacuationPoint() {
  return EVACUATION_SHELTER.LOCATION;
}
