// Terrain generation for Coastal District 001
// Phase 1: Terrain and Geography
//
// This module defines the geographical layout of the coastal town:
// - South: Arabian Sea and coastline
// - Southwest: Beach and hotels
// - Southeast: Fishing harbour
// - Centre: Town square and commercial market
// - North: Residential neighbourhood
// - East: River and estuary
// - Northwest: Elevated green hills and evacuation shelter

// World scale: 800m x 800m
// 1 Three.js unit = 1 meter for intuitive positioning
export const WORLD_SIZE = 800;
export const WORLD_BOUNDS = {
  minX: -WORLD_SIZE / 2,  // -400
  maxX: WORLD_SIZE / 2,   // 400
  minZ: -WORLD_SIZE / 2,  // -400
  maxZ: WORLD_SIZE / 2,   // 400
};

// Terrain elevation (y = height in meters)
// Key geographical features
export const COASTLINE = {
  // Northern edge of the Arabian Sea (ocean floor transitions to beach)
  // The coast runs east-west, facing south towards the ocean
  Z_COAST: -300,  // Center of beach area
  // Beach extends from Z = -350 (west) to Z = -250 (east)
  BEACH_START: -350,
  BEACH_END: -250,
};

export const BEACH = {
  // Sandy beach area, sloping from coastline inland
  // Width: ~100m from coast inland
  // Slope: gentle rise of 0-10m from sea level
  WIDTH: 100,
  MAX_HEIGHT: 10,  // Beach dunes peak
  // Beach area bounds in Z
  MIN_Z: -450,  // Western end
  MAX_Z: -150,  // Eastern end (meets town)
};

export const HARBOR = {
  // Fishing harbour on southeast coast
  // Area includes docks, warehouses, and fish market
  CENTER: { x: 100, z: 100 },  // Southeast quadrant
  WIDTH: 80,
  DEPTH: 120,
  // Harbour is at sea level (y = 0 to y = -5 for water)
};

export const RIVER = {
  // River originates in the north hills, flows through town east to meet the sea
  SOURCE: { x: -50, z: -350 },  // North hills
  MOUTH: { x: 200, z: 300 },     // Meets Arabian Sea in the east
  WIDTH: 15,  // Average river width in meters
  // The river flows roughly southeast through the center
};

export const HILLS = {
  // Elevated green hills in northwest
  // Elevation: 50-120m above sea level
  CENTER: { x: -200, z: -200 },
  RADIUS: 150,
  MAX_ELEVATION: 120,  // Highest point
  BASE_ELEVATION: 50,  // Hill base
};

export const TOWN_CENTER = {
  CENTER: { x: 0, z: 0 },
  RADIUS: 100,  // Town square area
};

export const RESIDENTIAL = {
  // North of town center, on gently sloping terrain
  CENTER: { x: -20, z: 200 },
  RADIUS: 150,
};

export const EVACUATION_SHELTER = {
  // Located on the highest ground in northwest hills
  // Safe from all water-based disasters
  LOCATION: { x: -280, z: -280 },
  SIZE: 30,  // 30m x 30m area
};

// Elevation function: returns the height at any (x, z) coordinate
// Uses mathematical terrain generation for smooth, natural slopes
export function getTerrainHeight(x, z) {
  let height = 0;

  // 1. Base terrain: gentle slope from sea level (south) to higher ground (north)
  // This creates a natural coastal plain that rises toward the hills
  const northSlope = THREE.MathUtils.mapLinear(z, -400, 400, -5, 25);
  height += northSlope;

  // 2. Coastline transition: from ocean to beach
  if (z < COASTLINE.Z_COAST) {
    // Ocean floor: slightly below sea level
    height = THREE.MathUtils.mapLinear(z, -500, COASTLINE.Z_COAST, -10, -2);
  } else if (z < COASTLINE.Z_COAST + 50) {
    // Beach ramp: steep rise from ocean to beach level
    height = THREE.MathUtils.mapLinear(z, COASTLINE.Z_COAST, COASTLINE.Z_COAST + 50, -2, 5);
  }

  // 3. Hills elevation
  const hillDist = Math.sqrt(
    Math.pow(x - HILLS.CENTER.x, 2) + Math.pow(z - HILLS.CENTER.z, 2)
  );
  if (hillDist < HILLS.RADIUS) {
    // Smooth hill shape using a cosine-based curve
    const hillFactor = (1 - Math.cos((hillDist / HILLS.RADIUS) * Math.PI)) / 2;
    const hillElevation = THREE.MathUtils.lerp(HILLS.BASE_ELEVATION, HILLS.MAX_ELEVATION, hillFactor);
    // Only apply if higher than current
    height = Math.max(height, hillElevation);
  }

  // 4. River valley - slight depression where river flows
  const riverDist = pointToLineDistance(x, z, RIVER.SOURCE, RIVER.MOUTH);
  if (riverDist < RIVER.WIDTH) {
    const riverDepth = THREE.MathUtils.mapLinear(riverDist, 0, RIVER.WIDTH / 2, 0, -3);
    height += riverDepth;
  }

  // 5. Harbour area - slight depression for water
  const harborCenterX = HARBOR.CENTER.x;
  const harborCenterZ = HARBOR.CENTER.z;
  const harborDist = Math.sqrt(
    Math.pow(x - harborCenterX, 2) + Math.pow(z - harborCenterZ, 2)
  );
  if (harborDist < Math.max(HARBOR.WIDTH, HARBOR.DEPTH) / 2) {
    // Harbor is at around sea level or slightly below
    height = Math.min(height, -2);
  }

  return height;
}

// Helper: distance from point to line segment (for river calculation)
function pointToLineDistance(px, pz, p1, p2) {
  const A = px - p1.x;
  const B = pz - p1.z;
  const C = p2.x - p1.x;
  const D = p2.z - p1.z;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, zz;
  if (param < 0) {
    xx = p1.x;
    zz = p1.z;
  } else if (param > 1) {
    xx = p2.x;
    zz = p2.z;
  } else {
    xx = p1.x + param * C;
    zz = p1.z + param * D;
  }

  const dx = px - xx;
  const dz = pz - zz;
  return Math.sqrt(dx * dx + dz * dz);
}

// Import THREE for the lerp function (will be resolved at runtime)
import * as THREE from "three";

// Terrain type classification for different visual treatments
export function getTerrainType(x, z) {
  // Ocean
  if (z < -450) return "ocean";

  // Beach
  if (z >= -450 && z < -300 && Math.abs(x) < 200) return "beach";

  // River
  const riverDist = pointToLineDistance(x, z, RIVER.SOURCE, RIVER.MOUTH);
  if (riverDist < RIVER.WIDTH) return "river";

  // Harbour water
  const harborDist = Math.sqrt(
    Math.pow(x - HARBOR.CENTER.x, 2) + Math.pow(z - HARBOR.CENTER.z, 2)
  );
  if (harborDist < Math.max(HARBOR.WIDTH, HARBOR.DEPTH) / 2 + 10) return "harbour";

  // Hills
  const hillDist = Math.sqrt(
    Math.pow(x - HILLS.CENTER.x, 2) + Math.pow(z - HILLS.CENTER.z, 2)
  );
  if (hillDist < HILLS.RADIUS) return "hills";

  // Town/Land
  return "land";
}

// Collision boundaries for different terrain types
export const TERRAIN_BOUNDS = {
  OCEAN: { maxDepth: 20 },  // How deep the ocean areas are
  BEACH: { minX: -200, maxX: 200, minZ: -450, maxZ: -250 },
  RIVER_BANKS: { width: 8 },  // Walkable area on river sides
  HILLS_ACCESS: { roads: [] },  // Will be defined in Phase 2
};