// Collision bounds and walkable areas for Coastal District 001
// Phase 1: Terrain and Geography
//
// Defines the navigable boundaries for players in the coastal environment.

import { WORLD_SIZE, COASTLINE, BEACH, HARBOR, RIVER, HILLS, EVACUATION_SHELTER } from "./terrain.js";

// Main walkable area bounds (excluding deep ocean)
export const WALKABLE_BOUNDS = {
  minX: -WORLD_SIZE / 2 + 50,  // Leave buffer from world edge
  maxX: WORLD_SIZE / 2 - 50,
  minZ: COASTLINE.Z_COAST + 30,  // Start from beach inland
  maxZ: WORLD_SIZE / 2 - 50,
};

// Ocean boundaries (non-walkable deep water)
export const OCEAN_BOUNDS = {
  minX: -WORLD_SIZE / 2,
  maxX: WORLD_SIZE / 2,
  minZ: -WORLD_SIZE / 2,
  maxZ: COASTLINE.Z_COAST - 50,  // Deep ocean
};

// River boundaries - walkable on banks but cannot cross water
export const RIVER_BOUNDS = {
  // River corridor where players cannot walk directly in water
  width: RIVER.WIDTH * 2,
  // River path is a curve, defined by its center line points
  centerLine: [
    [RIVER.SOURCE.x, RIVER.SOURCE.z],
    [-100, 100],
    [50, 200],
    [RIVER.MOUTH.x, RIVER.MOUTH.z],
  ],
};

// Beach access areas (players can walk on dry beach)
export const BEACH_ACCESS = {
  // Main beach areas where players can traverse
  northBeach: {
    minX: -150,
    maxX: 150,
    minZ: -400,
    maxZ: -300,
  },
};

// Harbour boundaries
export const HARBOR_BOUNDS = {
  minX: HARBOR.CENTER.x - HARBOR.WIDTH / 2 - 10,
  maxX: HARBOR.CENTER.x + HARBOR.WIDTH / 2 + 10,
  minZ: HARBOR.CENTER.z - HARBOR.DEPTH / 2 - 10,
  maxZ: HARBOR.CENTER.z + HARBOR.DEPTH / 2 + 10,
};

// Hill access roads (defined for Phase 2)
export const HILL_ACCESS_ROADS = {
  // Main road to the hills
  mainRoad: {
    start: { x: -100, z: 50 },
    end: { x: -280, z: -280 },
    width: 4,
  },
};

// Evacuation shelter safe zone
export const EVACUATION_BOUNDS = {
  ...EVACUATION_SHELTER,
  // The shelter provides safety from all disaster types
  safeFrom: ["tsunami", "flood", "fire"],
};

// Check if a position is within walkable bounds
export function isWalkable(x, z) {
  // Check main walkable area
  if (
    x >= WALKABLE_BOUNDS.minX &&
    x <= WALKABLE_BOUNDS.maxX &&
    z >= WALKABLE_BOUNDS.minZ &&
    z <= WALKABLE_BOUNDS.maxZ
  ) {
    return true;
  }

  // Check beach access (dry beach areas)
  if (
    x >= BEACH_ACCESS.northBeach.minX &&
    x <= BEACH_ACCESS.northBeach.maxX &&
    z >= BEACH_ACCESS.northBeach.minZ &&
    z <= BEACH_ACCESS.northBeach.maxZ
  ) {
    return true;
  }

  return false;
}

// Check if position is in deep water (not walkable)
export function isInDeepWater(x, z) {
  return z < COASTLINE.Z_COAST - 30;
}

// Get the safe zone (evacuation shelter) center
export function getEvacuationPoint() {
  return EVACUATION_SHELTER.LOCATION;
}