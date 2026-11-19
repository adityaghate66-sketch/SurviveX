// Beach for Coastal District 001
// Phase 1: Terrain and Geography (corrected in Phase 2)
//
// The beach is a sand band over the southern coastline (z = -300 .. -250).
// It samples the terrain grid itself, so it drapes exactly over the heightfield
// instead of hovering above or cutting into it.

import { useMemo } from "react";
import * as THREE from "three";
import { BEACH, COASTLINE, getMeshHeight } from "./terrain.js";

const BEACH_MIN_X = -380;
const BEACH_MAX_X = 175; // stops at the river mouth

export default function Beach() {
  const geometry = useMemo(() => {
    const width = BEACH_MAX_X - BEACH_MIN_X;
    const depth = BEACH.MAX_Z - COASTLINE.Z_COAST;

    const geo = new THREE.PlaneGeometry(width, depth, 96, 16);
    geo.rotateX(-Math.PI / 2);
    // Move the strip over the coastline band.
    geo.translate((BEACH_MIN_X + BEACH_MAX_X) / 2, 0, (COASTLINE.Z_COAST + BEACH.MAX_Z) / 2);

    const positions = geo.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      // 4cm above the heightfield: enough to avoid z-fighting, invisible in
      // first person, and it never floats because it uses the same grid.
      positions.setY(i, getMeshHeight(vertex.x, vertex.z) + 0.04);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow name="beach">
      <meshStandardMaterial color="#e4d3a8" roughness={0.96} metalness={0} />
    </mesh>
  );
}
