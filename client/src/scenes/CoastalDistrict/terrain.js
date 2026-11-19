// Terrain model for Coastal District 001
// Phase 1: Terrain and Geography (corrected in Phase 2)
//
// COORDINATE CONVENTION — this file is the single source of truth for the whole
// environment. Every scene component and the road network position themselves
// against it:
//
//   +X = east            -X = west
//   +Z = north (inland)  -Z = south (Arabian Sea)
//   y  = metres above sea level
//
// Geography:
//   - South       : Arabian Sea, coastline at z = -300, dry beach to z = -250
//   - Centre      : town square, commercial market
//   - North       : residential neighbourhood on the southern hill slopes
//   - Northwest   : elevated green hills and the evacuation shelter
//   - East        : river valley running from the hills to the sea
//   - Southeast   : fishing harbour at the river mouth
//
// Everything is generated from plain functions so the same numbers drive the
// visual mesh, the roads and (later) player collision. Nothing here depends on
// React or Three.js, which keeps it testable from Node.

export const WORLD_SIZE = 800;
export const WORLD_BOUNDS = {
  minX: -WORLD_SIZE / 2, // -400
  maxX: WORLD_SIZE / 2, //  400
  minZ: -WORLD_SIZE / 2, // -400
  maxZ: WORLD_SIZE / 2, //  400
};

// Terrain mesh resolution. Roads and props sample the visible surface through
// getMeshHeight(), which interpolates over this exact grid, so nothing floats
// above or sinks below what the player actually sees.
export const TERRAIN_SEGMENTS = 100; // 800m / 100 = 8m cells
export const TERRAIN_CELL = WORLD_SIZE / TERRAIN_SEGMENTS;

export const SEA_LEVEL = 0;

// Coastline. The sea occupies z < -300; the beach ramp runs -300..-250 and the
// flat coastal plain starts at z = -250.
export const COASTLINE = {
  Z_COAST: -300,
  BEACH_START: -300,
  BEACH_END: -250,
};

export const BEACH = {
  MIN_Z: -300,
  MAX_Z: -250,
  WIDTH: 50,
  MAX_HEIGHT: 2,
};

// Fishing harbour, southeast coast, just east of the river mouth.
export const HARBOR = {
  CENTER: { x: 285, z: -250 },
  WIDTH: 110,
  DEPTH: 110,
  BASIN_DEPTH: -2.4,
};

// The river leaves the northern hills, runs down the eastern side of the town
// and meets the sea at z = -310. Points are ordered source -> mouth.
export const RIVER = {
  SOURCE: { x: -60, z: 340 },
  MOUTH: { x: 200, z: -310 },
  PATH: [
    { x: -60, z: 340 },
    { x: 70, z: 300 },
    { x: 140, z: 230 },
    { x: 170, z: 150 },
    { x: 195, z: 50 },
    { x: 200, z: -80 },
    { x: 190, z: -200 },
    { x: 200, z: -310 },
  ],
  WIDTH: 18, // channel width in metres
  BANK_BLEND: 28, // grassy banks blend into the channel over this distance
  CARVE_DEPTH: 4.2,
  ESTUARY_Z: -140, // channel starts widening south of this line
  ESTUARY_BOOST: 1.3,
};

// Rolling green hills in the northwest. A smooth bump with zero slope at both
// the centre and the rim, so it blends into the plain without a cliff.
export const HILLS = {
  CENTER: { x: -280, z: 250 },
  RADIUS: 210,
  PEAK: 72,
};

export const EVACUATION_SHELTER = {
  LOCATION: { x: -290, z: 290 },
  SIZE: 40,
};

export const TOWN_CENTER = {
  CENTER: { x: 0, z: 0 },
  RADIUS: 24,
};

export const RESIDENTIAL = {
  CENTER: { x: -30, z: 200 },
  RADIUS: 160,
};

// ---------------------------------------------------------------------------
// Small math helpers (no Three.js dependency)
// ---------------------------------------------------------------------------

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function smoothstep(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hash2(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// Deterministic 0..1 value used to break up flat colours without textures.
export function groundVariation(x, z) {
  return hash2(Math.round(x), Math.round(z));
}

// Shortest distance from a point to a polyline, plus the closest segment.
export function distanceToPolyline(x, z, path) {
  let best = Infinity;
  let bestSegment = 0;
  let bestT = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz || 1;

    let t = ((x - a.x) * dx + (z - a.z) * dz) / lengthSq;
    t = t < 0 ? 0 : t > 1 ? 1 : t;

    const px = a.x + t * dx;
    const pz = a.z + t * dz;
    const distance = Math.hypot(x - px, z - pz);

    if (distance < best) {
      best = distance;
      bestSegment = i;
      bestT = t;
    }
  }

  return { distance: best, segment: bestSegment, t: bestT };
}

// ---------------------------------------------------------------------------
// Height model
// ---------------------------------------------------------------------------

function coastalPlain(z) {
  // Gentle rise from the top of the beach (2.2m at z = -250) to inland
  // (26m at z = 400). Gives the town a low, flood-prone coastal strip.
  return lerp(2.2, 26, clamp01((z - BEACH.MAX_Z) / (WORLD_BOUNDS.maxZ - BEACH.MAX_Z)));
}

function oceanFloor(z) {
  // Seabed: 0m at the shoreline, about -7m at z = -400.
  return (z - COASTLINE.Z_COAST) * 0.07;
}

export function hillHeight(x, z) {
  const distance = Math.hypot(x - HILLS.CENTER.x, z - HILLS.CENTER.z);
  if (distance >= HILLS.RADIUS) return 0;
  return HILLS.PEAK * smoothstep(1 - distance / HILLS.RADIUS);
}

function riverWidthFactor(z) {
  return 1 + RIVER.ESTUARY_BOOST * smoothstep((RIVER.ESTUARY_Z - z) / 150);
}

// Depth removed from the terrain by the river channel (0 outside the valley).
export function riverCarveDepth(x, z) {
  const { distance } = distanceToPolyline(x, z, RIVER.PATH);
  const halfWidth = (RIVER.WIDTH / 2) * riverWidthFactor(z);
  const outer = halfWidth + RIVER.BANK_BLEND;

  if (distance >= outer) return 0;
  if (distance <= halfWidth) return RIVER.CARVE_DEPTH;

  // Grassy bank: smoothly climbs back to the plain.
  return RIVER.CARVE_DEPTH * (1 - smoothstep((distance - halfWidth) / RIVER.BANK_BLEND));
}

// True where the river channel is wide/deep enough to be open water.
export function isRiverChannel(x, z, extra = 0) {
  const { distance } = distanceToPolyline(x, z, RIVER.PATH);
  return distance < (RIVER.WIDTH / 2) * riverWidthFactor(z) + extra;
}

export function harborBasinFactor(x, z) {
  const distance = Math.hypot(x - HARBOR.CENTER.x, z - HARBOR.CENTER.z);
  const radius = HARBOR.WIDTH / 2;
  const outer = radius + 20;
  if (distance >= outer) return 0;
  return smoothstep(1 - distance / outer);
}

// Analytic terrain height at any world position.
export function getTerrainHeight(x, z) {
  let height;

  if (z < COASTLINE.Z_COAST) {
    height = oceanFloor(z);
  } else if (z < BEACH.MAX_Z) {
    const t = smoothstep((z - COASTLINE.Z_COAST) / (BEACH.MAX_Z - COASTLINE.Z_COAST));
    // Dry sand: 0.05m at the waterline up to 2.2m at the back of the beach.
    height = lerp(0.05, 2.2, t);
  } else {
    height = coastalPlain(z);
  }

  height += hillHeight(x, z);
  height -= riverCarveDepth(x, z);

  // Harbour basin: a shallow bowl that the sea plane fills.
  const basin = harborBasinFactor(x, z);
  if (basin > 0) {
    height = lerp(height, HARBOR.BASIN_DEPTH, basin);
  }

  return height;
}

// Height of the *visible* terrain mesh at (x, z).
//
// TerrainMesh renders PlaneGeometry on a TERRAIN_SEGMENTS grid whose vertices
// use getTerrainHeight(). Sampling the same grid here (bilinearly) means roads,
// sidewalks and props sit exactly on the rendered surface instead of hovering
// over it or sinking into it - the single biggest cause of "floating geometry".
export function getMeshHeight(x, z) {
  const gx = clamp((x - WORLD_BOUNDS.minX) / TERRAIN_CELL, 0, TERRAIN_SEGMENTS - 1e-6);
  const gz = clamp((z - WORLD_BOUNDS.minZ) / TERRAIN_CELL, 0, TERRAIN_SEGMENTS - 1e-6);

  const i = Math.floor(gx);
  const j = Math.floor(gz);
  const fx = gx - i;
  const fz = gz - j;

  const x0 = WORLD_BOUNDS.minX + i * TERRAIN_CELL;
  const z0 = WORLD_BOUNDS.minZ + j * TERRAIN_CELL;

  const h00 = getTerrainHeight(x0, z0);
  const h10 = getTerrainHeight(x0 + TERRAIN_CELL, z0);
  const h01 = getTerrainHeight(x0, z0 + TERRAIN_CELL);
  const h11 = getTerrainHeight(x0 + TERRAIN_CELL, z0 + TERRAIN_CELL);

  return lerp(lerp(h00, h10, fx), lerp(h01, h11, fx), fz);
}

// ---------------------------------------------------------------------------
// Classification (drives terrain colours and walkability)
// ---------------------------------------------------------------------------

export function getTerrainType(x, z) {
  if (z < COASTLINE.Z_COAST) return "ocean";
  if (harborBasinFactor(x, z) > 0.35) return "harbour";
  if (isRiverChannel(x, z, 2)) return "river";
  if (z < BEACH.MAX_Z) return "beach";
  if (hillHeight(x, z) > 3) return "hills";
  return "land";
}

// Local slope in metres per metre, used for cheap shading and cliff detection.
export function getSlope(x, z, step = 4) {
  const dx = getTerrainHeight(x + step, z) - getTerrainHeight(x - step, z);
  const dz = getTerrainHeight(x, z + step) - getTerrainHeight(x, z - step);
  return Math.hypot(dx, dz) / (2 * step);
}

// X coordinate of the river channel centre at a given z. The path is ordered
// strictly north -> south, so this is a simple piecewise interpolation.
export function riverCentreAtZ(z) {
  const path = RIVER.PATH;
  if (z >= path[0].z) return path[0].x;
  if (z <= path[path.length - 1].z) return path[path.length - 1].x;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (z <= a.z && z >= b.z) {
      const t = (a.z - z) / (a.z - b.z || 1);
      return lerp(a.x, b.x, t);
    }
  }

  return path[path.length - 1].x;
}

// Full width of the channel (bank to bank) at a given z.
export function riverWidthAtZ(z) {
  return RIVER.WIDTH * riverWidthFactor(z);
}

// Water surface height of the river. The channel bed descends from the hills
// to the sea; the surface sits a little above the bed and never below the sea.
export function getRiverSurfaceHeight(z) {
  const centreX = riverCentreAtZ(z);
  const bed = getTerrainHeight(centreX, z);
  return Math.max(bed + 1.2, SEA_LEVEL + 0.03);
}
