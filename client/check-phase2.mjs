// Phase 2 layout checks for Coastal District 001.
//
//   node check-phase2.mjs
//
// Validates the data layer that the 3D scene is built from: terrain is smooth
// and finite, roads stay on land, bridges actually cross the river, the road
// network is fully connected and the beach is dry sand (not underwater).
// Run from the client/ directory.

import * as THREE from "three";
import * as T from "./src/scenes/CoastalDistrict/terrain.js";
import * as R from "./src/scenes/CoastalDistrict/roads.js";
import * as B from "./src/scenes/CoastalDistrict/coastalBounds.js";

const failures = [];
let checks = 0;

function check(name, condition, detail = "") {
  checks++;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function near(a, b, tolerance = 1) {
  return Math.abs(a - b) <= tolerance;
}

// ---------------------------------------------------------------------------
// 1. Terrain: finite, smooth, no cliffs
// ---------------------------------------------------------------------------
let maxStep = 0;
let maxStepAt = null;
let nonFinite = 0;

for (let x = -400; x <= 400; x += 8) {
  for (let z = -400; z <= 400; z += 8) {
    const h = T.getTerrainHeight(x, z);
    if (!Number.isFinite(h)) nonFinite++;
    const hx = T.getTerrainHeight(x + 8, z);
    const hz = T.getTerrainHeight(x, z + 8);
    const step = Math.max(Math.abs(hx - h), Math.abs(hz - h));
    if (step > maxStep) {
      maxStep = step;
      maxStepAt = [x, z];
    }
  }
}

check("terrain heights are finite", nonFinite === 0, `${nonFinite} non-finite samples`);
check(
  "terrain has no vertical cliffs (max 8m-cell step < 5m)",
  maxStep < 5,
  `max step ${maxStep.toFixed(2)}m at ${maxStepAt}`
);

// ---------------------------------------------------------------------------
// 2. Landmarks are where the design says they are
// ---------------------------------------------------------------------------
const town = T.getTerrainHeight(0, 0);
const hill = T.getTerrainHeight(T.HILLS.CENTER.x, T.HILLS.CENTER.z);
const sea = T.getTerrainHeight(0, -380);
const harbour = T.getTerrainHeight(T.HARBOR.CENTER.x, T.HARBOR.CENTER.z);

check("town centre is on land", town > 1 && town < 40, `${town.toFixed(1)}m`);
check("sea floor is below sea level", sea < -1, `${sea.toFixed(1)}m`);
check("hill is elevated", hill > 60, `${hill.toFixed(1)}m`);
check("harbour basin is below sea level", harbour < -1, `${harbour.toFixed(1)}m`);
check(
  "evacuation shelter is high ground",
  T.getTerrainHeight(T.EVACUATION_SHELTER.LOCATION.x, T.EVACUATION_SHELTER.LOCATION.z) > 60,
  `${T.getTerrainHeight(T.EVACUATION_SHELTER.LOCATION.x, T.EVACUATION_SHELTER.LOCATION.z).toFixed(1)}m`
);

// ---------------------------------------------------------------------------
// 3. Beach is dry sand, not underwater
// ---------------------------------------------------------------------------
for (const z of [-295, -285, -275, -265, -255]) {
  const h = T.getTerrainHeight(-40, z);
  check(`beach at z=${z} is above sea level`, h > 0, `${h.toFixed(2)}m`);
}
check("coastline is classified as beach", T.getTerrainType(0, -275) === "beach");

// ---------------------------------------------------------------------------
// 4. Roads: inside the map, on land, not in water
// ---------------------------------------------------------------------------
function sampleRoad(road, spacing = 3) {
  const points = road.waypoints ?? [road.start, road.end];
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.z)));
  const length = curve.getLength();
  const count = Math.max(2, Math.ceil(length / spacing));
  return curve.getSpacedPoints(count).map((v) => ({ x: v.x, z: v.z }));
}

for (const road of R.ALL_ROADS) {
  const samples = sampleRoad(road);
  let offMap = 0;
  let inWater = 0;
  let belowSea = 0;

  for (const point of samples) {
    if (
      point.x < T.WORLD_BOUNDS.minX ||
      point.x > T.WORLD_BOUNDS.maxX ||
      point.z < T.WORLD_BOUNDS.minZ ||
      point.z > T.WORLD_BOUNDS.maxZ
    ) {
      offMap++;
    }

    const h = T.getTerrainHeight(point.x, point.z);
    if (!Number.isFinite(h)) offMap++;
    if (h < 0.3) belowSea++;
    if (T.isRiverChannel(point.x, point.z) || T.harborBasinFactor(point.x, point.z) > 0.4) inWater++;
  }

  check(`${road.name}: inside map bounds`, offMap === 0, `${offMap} samples outside`);
  check(`${road.name}: on dry land`, inWater === 0, `${inWater} samples in river/harbour water`);
  check(
    `${road.name}: above sea level`,
    belowSea <= 1,
    `${belowSea}/${samples.length} samples below 0.3m`
  );
}

// ---------------------------------------------------------------------------
// 5. Bridges cross the river
// ---------------------------------------------------------------------------
for (const bridge of R.BRIDGES) {
  const riverX = T.riverCentreAtZ(bridge.start.z);
  const halfChannel = T.riverWidthAtZ(bridge.start.z) / 2;
  check(
    `${bridge.name}: starts west of the channel`,
    bridge.start.x < riverX - halfChannel,
    `start ${bridge.start.x.toFixed(1)} vs bank ${(riverX - halfChannel).toFixed(1)}`
  );
  check(
    `${bridge.name}: ends east of the channel`,
    bridge.end.x > riverX + halfChannel,
    `end ${bridge.end.x.toFixed(1)} vs bank ${(riverX + halfChannel).toFixed(1)}`
  );
  check(`${bridge.name}: has a sane span`, bridge.end.x - bridge.start.x > 20);
}

// ---------------------------------------------------------------------------
// 6. Network connectivity (single component, no orphan roads)
// ---------------------------------------------------------------------------
// Bridges are part of the network even though Roads.jsx renders them separately.
const roads = [...R.ALL_ROADS, ...R.BRIDGES];
const roadSamples = roads.map((road) => sampleRoad(road, 4));
const parent = roads.map((_, index) => index);

function find(index) {
  while (parent[index] !== index) {
    parent[index] = parent[parent[index]];
    index = parent[index];
  }
  return index;
}

function union(a, b) {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent[ra] = rb;
}

// Two roads are connected when any of their sampled centre lines come within
// the combined half-width; that covers T-junctions and crossings, not just
// roads whose end points happen to coincide.
function touches(a, b) {
  const tolerance = (roads[a].width + roads[b].width) / 2 + 2;
  for (const p of roadSamples[a]) {
    for (const q of roadSamples[b]) {
      if (Math.hypot(p.x - q.x, p.z - q.z) <= tolerance) return true;
    }
  }
  return false;
}

for (let i = 0; i < roads.length; i++) {
  for (let j = i + 1; j < roads.length; j++) {
    if (touches(i, j)) union(i, j);
  }
}

const components = new Set(roads.map((_, index) => find(index)));
check(
  "road network is fully connected",
  components.size === 1,
  `${components.size} separate components`
);

// Every road must touch at least one other road (no floating stubs).
const touchingCount = roads.map((_, i) =>
  roads.reduce((count, __, j) => (i !== j && touches(i, j) ? count + 1 : count), 0)
);
roads.forEach((road, index) => {
  check(`${road.name}: connects to the network`, touchingCount[index] > 0);
});

// ---------------------------------------------------------------------------
// 7. Harbour quay is on land
// ---------------------------------------------------------------------------
check(
  "harbour quay is above water",
  T.getTerrainHeight(R.HARBOUR_QUAY.x, R.HARBOUR_QUAY.z) > 0.4,
  `${T.getTerrainHeight(R.HARBOUR_QUAY.x, R.HARBOUR_QUAY.z).toFixed(2)}m`
);
check(
  "harbour quay is walkable",
  B.isWalkable(R.HARBOUR_QUAY.x, R.HARBOUR_QUAY.z),
  "isWalkable() returned false"
);

// ---------------------------------------------------------------------------
// 8. Walkability basics
// ---------------------------------------------------------------------------
check("town centre is walkable", B.isWalkable(0, 0));
check("deep sea is not walkable", !B.isWalkable(0, -390));
check("river channel is not walkable", !B.isWalkable(T.riverCentreAtZ(-160), -160, 0));
check("evacuation shelter is walkable", B.isWalkable(T.EVACUATION_SHELTER.LOCATION.x, T.EVACUATION_SHELTER.LOCATION.z));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\n✗ Phase 2 checks failed (${failures.length}/${checks})\n`);
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}

console.log(`✓ Phase 2 checks passed (${checks} checks)`);
console.log(`  terrain max cell step : ${maxStep.toFixed(2)}m`);
console.log(`  road network          : ${roads.length} roads, ${components.size} component(s)`);
console.log(`  harbour quay          : (${R.HARBOUR_QUAY.x}, ${R.HARBOUR_QUAY.z})`);
