// Beach environment component for Coastal District 001
// Phase 1: Terrain and Geography
//
// Renders the sandy beach area along the coastline.

import { useMemo } from "react";
import * as THREE from "three";
import {
  BEACH,
  COASTLINE,
  WORLD_SIZE,
  getTerrainHeight,
} from "./terrain.js";

export default function Beach() {
  // Create beach geometry as a separate mesh for different material
  const beachGeometry = useMemo(() => {
    // Beach area: from coastline inland
    const width = WORLD_SIZE;
    const depth = BEACH.WIDTH;

    const geometry = new THREE.PlaneGeometry(width, depth, 32, 32);
    geometry.rotateX(-Math.PI / 2);

    // Position the beach starting at the coastline
    geometry.translate(0, 0, -COASTLINE.Z_COAST);

    // Apply gentle slope to beach height
    const positionAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      const y = getTerrainHeight(vertex.x, vertex.z);
      positionAttribute.setXYZ(i, vertex.x, y, vertex.z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, []);

  const beachMaterial = new THREE.meshStandardMaterial({
    color: "#f4a460",  // Sandy beige
    roughness: 0.9,
    metalness: 0.1,
  });

  return (
    <mesh
      geometry={beachGeometry}
      material={beachMaterial}
      receiveShadow
    />
  );
}