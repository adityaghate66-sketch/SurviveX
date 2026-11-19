// Mission 2 (Coastal) data checks.
//   node check-mission2.mjs
// Run from client/ directory.

import {
  COASTAL_ZONES,
  COASTAL_ZONE_IDS,
  COASTAL_SPAWN,
} from "./src/game/coastalMission.js";
import { isWalkable } from "./src/scenes/CoastalDistrict/coastalBounds.js";
import { isOnBridgeDeck } from "./src/scenes/CoastalDistrict/roads.js";

const failures = [];
let checks = 0;

function check(name, condition, detail = "") {
  checks++;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function inZone(zone, x, z) {
  return (
    x >= zone.bounds.minX &&
    x <= zone.bounds.maxX &&
    z >= zone.bounds.minZ &&
    z <= zone.bounds.maxZ
  );
}

function standable(x, z) {
  return isWalkable(x, z) || isOnBridgeDeck(x, z);
}

// 1) Zone ids unique
check(
  "zone ids are unique",
  new Set(COASTAL_ZONE_IDS).size === COASTAL_ZONE_IDS.length,
  `ids: ${COASTAL_ZONE_IDS.join(", ")}`
);

// 2) Zones do not overlap
for (let i = 0; i < COASTAL_ZONES.length; i++) {
  for (let j = i + 1; j < COASTAL_ZONES.length; j++) {
    const a = COASTAL_ZONES[i];
    const b = COASTAL_ZONES[j];
    const overlap =
      a.bounds.minX <= b.bounds.maxX &&
      a.bounds.maxX >= b.bounds.minX &&
      a.bounds.minZ <= b.bounds.maxZ &&
      a.bounds.maxZ >= b.bounds.minZ;
    check(`zones do not overlap: ${a.id} vs ${b.id}`, !overlap);
  }
}

// 3) Each zone contains at least one walkable/standable point
for (const zone of COASTAL_ZONES) {
  let found = false;
  const cx = (zone.bounds.minX + zone.bounds.maxX) / 2;
  const cz = (zone.bounds.minZ + zone.bounds.maxZ) / 2;
  const samples = [
    [cx, cz],
    [zone.bounds.minX + 1, cz],
    [zone.bounds.maxX - 1, cz],
    [cx, zone.bounds.minZ + 1],
    [cx, zone.bounds.maxZ - 1],
  ];
  for (const [x, z] of samples) {
    if (standable(x, z)) {
      found = true;
      break;
    }
  }
  check(`zone has a standable point: ${zone.id} (${zone.name})`, found);
}

// 4) Spawn is standable and not inside any zone
check("spawn is standable", standable(COASTAL_SPAWN.x, COASTAL_SPAWN.z));
const spawnInZone = COASTAL_ZONES.find((z) => inZone(z, COASTAL_SPAWN.x, COASTAL_SPAWN.z));
check("spawn is outside all zones", !spawnInZone, spawnInZone ? spawnInZone.id : "");

// 5) BFS reachability from spawn to each zone (grid step 4m)
const STEP = 4;
const minX = -350;
const maxX = 350;
const minZ = -350;
const maxZ = 50;
const W = Math.floor((maxX - minX) / STEP) + 1;
const H = Math.floor((maxZ - minZ) / STEP) + 1;

function key(ix, iz) {
  return `${ix},${iz}`;
}

function canStandGrid(ix, iz) {
  const x = minX + ix * STEP;
  const z = minZ + iz * STEP;
  return standable(x, z);
}

const startIx = Math.round((COASTAL_SPAWN.x - minX) / STEP);
const startIz = Math.round((COASTAL_SPAWN.z - minZ) / STEP);

const visited = new Set();
const q = [];
if (
  startIx >= 0 &&
  startIx < W &&
  startIz >= 0 &&
  startIz < H &&
  canStandGrid(startIx, startIz)
) {
  visited.add(key(startIx, startIz));
  q.push([startIx, startIz]);
}

const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

while (q.length > 0) {
  const [ix, iz] = q.shift();
  for (const [dx, dz] of dirs) {
    const nx = ix + dx;
    const nz = iz + dz;
    const k = key(nx, nz);
    if (nx < 0 || nx >= W || nz < 0 || nz >= H) continue;
    if (visited.has(k)) continue;
    if (!canStandGrid(nx, nz)) continue;
    visited.add(k);
    q.push([nx, nz]);
  }
}

for (const zone of COASTAL_ZONES) {
  let reachable = false;
  const cx = (zone.bounds.minX + zone.bounds.maxX) / 2;
  const cz = (zone.bounds.minZ + zone.bounds.maxZ) / 2;
  const samples = [
    [cx, cz],
    [zone.bounds.minX + 2, cz],
    [zone.bounds.maxX - 2, cz],
    [cx, zone.bounds.minZ + 2],
    [cx, zone.bounds.maxZ - 2],
  ];
  for (const [x, z] of samples) {
    const ix = Math.round((x - minX) / STEP);
    const iz = Math.round((z - minZ) / STEP);
    if (visited.has(key(ix, iz))) {
      reachable = true;
      break;
    }
  }
  check(`zone reachable from spawn (BFS): ${zone.id} (${zone.name})`, reachable);
}

if (failures.length > 0) {
  console.error(`\n✗ Mission 2 checks failed (${failures.length}/${checks})\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}

console.log(`✓ Mission 2 checks passed (${checks} checks)`);
console.log(`  zones: ${COASTAL_ZONE_IDS.join(", ")}`);
console.log(`  spawn: (${COASTAL_SPAWN.x}, ${COASTAL_SPAWN.z})`);