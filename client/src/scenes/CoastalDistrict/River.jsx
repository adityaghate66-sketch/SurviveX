// River and estuary for Coastal District 001
// Phase 1: Terrain and Geography (corrected in Phase 2)
//
// Replaces the old tube that hugged the terrain. This builds a flat water
// surface that sits *inside* the carved valley, widens into an estuary at the
// coast and follows the channel centre line from the hills to the sea.

import { useMemo } from "react";
import * as THREE from "three";
import {
  RIVER,
  SEA_LEVEL,
  getRiverSurfaceHeight,
  riverWidthAtZ,
} from "./terrain.js";

const SAMPLES = 90;

export default function River() {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      RIVER.PATH.map((point) => new THREE.Vector3(point.x, 0, point.z))
    );

    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i < SAMPLES; i++) {
      const t = i / (SAMPLES - 1);
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);

      // Perpendicular in the XZ plane.
      const nx = -tangent.z;
      const nz = tangent.x;
      const normalLength = Math.hypot(nx, nz) || 1;

      const halfWidth = riverWidthAtZ(point.z) / 2;
      const surface = Math.max(getRiverSurfaceHeight(point.z), SEA_LEVEL + 0.06);

      positions.push(
        point.x + (nx / normalLength) * halfWidth,
        surface,
        point.z + (nz / normalLength) * halfWidth,
        point.x - (nx / normalLength) * halfWidth,
        surface,
        point.z - (nz / normalLength) * halfWidth
      );

      uvs.push(0, t, 1, t);

      if (i < SAMPLES - 1) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} name="river" receiveShadow>
      <meshStandardMaterial
        color="#2f6f7d"
        roughness={0.18}
        metalness={0.4}
        transparent
        opacity={0.92}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}
