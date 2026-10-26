// Collision helpers for the player.
//
// These are plain functions with no React or Three.js dependency, which keeps
// them easy to reason about and easy to test from Node.

/**
 * Pushes a circle (the player) out of a single rectangular obstacle.
 *
 * Works by finding the closest point on the box to the circle's centre. If that
 * point is closer than `radius`, the player is overlapping and gets moved out.
 *
 * @param {{x:number, z:number}} position mutated in place
 * @param {number} radius player collision radius
 * @param {{minX:number,maxX:number,minZ:number,maxZ:number}} box obstacle
 */
export function resolveObstacle(position, radius, box) {
  const closestX = Math.max(box.minX, Math.min(position.x, box.maxX));
  const closestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ));

  const dx = position.x - closestX;
  const dz = position.z - closestZ;
  const distanceSq = dx * dx + dz * dz;

  if (distanceSq > radius * radius) return;

  if (distanceSq > 1e-6) {
    // Touching an edge or corner: push straight out along the overlap normal.
    const distance = Math.sqrt(distanceSq);
    const push = radius - distance;
    position.x += (dx / distance) * push;
    position.z += (dz / distance) * push;
    return;
  }

  // Centre is inside the box: leave through the nearest edge.
  const toLeft = position.x - box.minX;
  const toRight = box.maxX - position.x;
  const toFront = position.z - box.minZ;
  const toBack = box.maxZ - position.z;
  const smallest = Math.min(toLeft, toRight, toFront, toBack);

  if (smallest === toLeft) position.x = box.minX - radius;
  else if (smallest === toRight) position.x = box.maxX + radius;
  else if (smallest === toFront) position.z = box.minZ - radius;
  else position.z = box.maxZ + radius;
}

/**
 * Keeps the player inside the four walls.
 * @param {{x:number, z:number}} position mutated in place
 */
export function clampToRoom(position, radius, bounds) {
  position.x = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, position.x));
  position.z = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, position.z));
}
