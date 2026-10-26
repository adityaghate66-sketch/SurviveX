import assert from "node:assert/strict";
import { OBSTACLES, PLAYER_SPAWN, ROOM_BOUNDS } from "./src/scenes/classroomLayout.js";
import { clampToRoom, resolveObstacle } from "./src/game/collision.js";

const RADIUS = 0.45;
const SPEED = 4;
const STEP = 1 / 60;

function isInsideObstacle({ x, z }, box, radius) {
  const cx = Math.max(box.minX, Math.min(x, box.maxX));
  const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
  return (x - cx) ** 2 + (z - cz) ** 2 < radius * radius - 1e-9;
}

// 1. Spawn must be clear.
const spawn = { x: PLAYER_SPAWN[0], z: PLAYER_SPAWN[2] };
for (const box of OBSTACLES) {
  assert.ok(!isInsideObstacle(spawn, box, RADIUS), "spawn overlaps an obstacle");
}
console.log("ok  spawn is clear of all obstacles");

// 2. Walk forward (W = -z) into the desk row and confirm we stop, not pass through.
function simulate(startX, startZ, dirX, dirZ, frames) {
  const pos = { x: startX, z: startZ };
  for (let i = 0; i < frames; i++) {
    pos.x += dirX * SPEED * STEP;
    pos.z += dirZ * SPEED * STEP;
    clampToRoom(pos, RADIUS, ROOM_BOUNDS);
    for (const box of OBSTACLES) resolveObstacle(pos, RADIUS, box);
    clampToRoom(pos, RADIUS, ROOM_BOUNDS);
  }
  return pos;
}

// Walk forward from the actual spawn down the aisle.
const walkFromSpawn = simulate(spawn.x, spawn.z, 0, -1, 120);
console.log("    spawn -> forward run reached z =", walkFromSpawn.z.toFixed(3));
assert.ok(spawn.z - walkFromSpawn.z > 5, "spawn has too little clear space ahead");
console.log("ok  spawn has a clear run into the room");

// Walk straight at a desk column instead.
const blocked = simulate(0, spawn.z, 0, -1, 240);
console.log("    walked into desk column, stopped at z =", blocked.z.toFixed(3));
assert.ok(blocked.z >= 4.7 + 1.35 + RADIUS - 1e-6, "walked through the desk");
for (const box of OBSTACLES) {
  assert.ok(!isInsideObstacle(blocked, box, RADIUS), "ended inside an obstacle");
}
console.log("ok  forward movement is blocked by the front desk row");

// 3. Walking straight into a desk must not creep through it over many frames.
const pushed = simulate(0, spawn.z, 0, -1, 900);
assert.ok(Math.abs(pushed.z - blocked.z) < 0.001, "player creeps through the desk over time");
console.log("ok  no creep-through after 15 simulated seconds of pushing");

// 4. The side corridor is still walkable (collision is not over-blocking).
const corridor = simulate(-5, spawn.z, 0, -1, 400);
console.log("    corridor walked to z =", corridor.z.toFixed(3));
assert.ok(corridor.z < -7, "side corridor is blocked unexpectedly");
console.log("ok  left aisle is walkable end to end");

// 5. Walls clamp.
const far = { x: 999, z: -999 };
clampToRoom(far, RADIUS, ROOM_BOUNDS);
assert.equal(far.x, ROOM_BOUNDS.maxX - RADIUS);
assert.equal(far.z, ROOM_BOUNDS.minZ + RADIUS);
console.log("ok  room bounds clamp the player");

// 6. Diagonal movement into a desk corner does not stick or tunnel.
const diag = simulate(3.2, spawn.z, -1 / Math.SQRT2, -1 / Math.SQRT2, 300);
for (const box of OBSTACLES) {
  assert.ok(!isInsideObstacle(diag, box, RADIUS), "diagonal motion ended inside an obstacle");
}
console.log("ok  diagonal movement resolves cleanly");

console.log("\nAll collision checks passed.");
