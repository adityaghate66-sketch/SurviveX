// Hills environment component for Coastal District 001
// Phase 1: Terrain and Geography
//
// Renders the elevated green hills in the northwest area.

import { useMemo } from "react";
import * as THREE from "three";
import {
  HILLS,
  WORLD_SIZE,
  getTerrainHeight,
} from "./terrain.js";

export default function Hills() {
  // Create hill geometry as a dome-like structure
  const hillGeometry = useMemo(() => {
    // Create a sphere and clip it to make rolling hills
    const sphereGeometry = new THREE.SphereGeometry(HILLS.RADIUS * 2, 64, 64);

    // Apply terrain heights to create natural hill shape
    const positionAttribute = sphereGeometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);

      // Only apply hills to the northwest area
      const x = vertex.x + HILLS.CENTER.x;
      const z = vertex.z + HILLS.CENTER.z;

      if (x < 0 && z < 0) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist < HILLS.RADIUS) {
          const height = getTerrainHeight(vertex.x, vertex.z);
          positionAttribute.setXYZ(i, vertex.x, height, vertex.z);
        }
      }
    }

    sphereGeometry.computeVertexNormals();
    return sphereGeometry;
  }, []);

  const hillMaterial = new THREE.meshStandardMaterial({
    color: "#2e8b57",  // Green hills
    roughness: 0.7,
    metalness: 0.2,
  });

  return (
    <mesh
      geometry={hillGeometry}
      material={hillMaterial}
      receiveShadow
    />
  );
}