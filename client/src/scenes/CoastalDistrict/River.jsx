// River and estuary component for Coastal District 001
// Phase 1: Terrain and Geography
//
// Renders the river valley and estuary where the river meets the sea.

import { useMemo } from "react";
import * as THREE from "three";
import { RIVER, getTerrainHeight } from "./terrain.js";

export default function River() {
  // Create river as a mesh with water-like material
  const riverGeometry = useMemo(() => {
    // Create a curved river path using a tube geometry
    const curvePoints = [
      new THREE.Vector3(RIVER.SOURCE.x, 0, RIVER.SOURCE.z),
      new THREE.Vector3(-100, 0, 100),
      new THREE.Vector3(50, 0, 200),
      new THREE.Vector3(RIVER.MOUTH.x, 0, RIVER.MOUTH.z),
    ];

    const curve = new THREE.CatmullRomCurve3(curvePoints);

    // Tube geometry follows the curved path
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, RIVER.WIDTH / 2, 8, false);

    // Apply water depth to vertices
    const positionAttribute = tubeGeometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      const y = getTerrainHeight(vertex.x, vertex.z) - 0.5;  // Water is slightly below terrain
      positionAttribute.setXYZ(i, vertex.x, y, vertex.z);
    }

    tubeGeometry.computeVertexNormals();
    return tubeGeometry;
  }, []);

  const riverMaterial = new THREE.meshStandardMaterial({
    color: "#4a90d9",  // Water blue
    roughness: 0.3,
    metalness: 0.6,
    transparent: true,
    opacity: 0.7,
    envMapIntensity: 0.5,
  });

  return (
    <mesh
      geometry={riverGeometry}
      material={riverMaterial}
      receiveShadow
    />
  );
}