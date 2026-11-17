// Terrain visualization component for Coastal District 001
// Phase 1: Terrain and Geography
//
// This component renders the base terrain mesh with proper geometry and materials
// for the coastal environment.

import { useMemo } from "react";
import * as THREE from "three";
import {
  WORLD_SIZE,
  COASTLINE,
  BEACH,
  HILLS,
  RIVER,
  getTerrainHeight,
  getTerrainType,
} from "./terrain.js";

// Terrain segment size for better performance
const SEGMENT_SIZE = 50;  // 50m segments
const SEGMENTS_X = Math.ceil(WORLD_SIZE / SEGMENT_SIZE);
const SEGMENTS_Z = Math.ceil(WORLD_SIZE / SEGMENT_SIZE);

export default function TerrainMesh({
  visible = true,
  showDebug = false,
}) {
  // Create the terrain geometry using a heightmap approach
  const terrainGeometry = useMemo(() => {
    const width = WORLD_SIZE;
    const depth = WORLD_SIZE;
    const widthSegments = SEGMENTS_X;
    const depthSegments = SEGMENTS_Z;

    const geometry = new THREE.PlaneGeometry(width, depth, widthSegments, depthSegments);

    // Rotate the plane to be horizontal (Three.js planes are Y-up by default)
    geometry.rotateX(-Math.PI / 2);

    // Apply heightmap to each vertex
    const positionAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);

      // Convert from local plane coordinates to world coordinates
      // Plane is centered at origin, so we need to offset
      const worldX = vertex.x;
      const worldZ = vertex.z;
      const worldY = getTerrainHeight(worldX, worldZ);

      vertex.y = worldY;
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [visible, showDebug]);

  // Create terrain materials based on type
  const terrainMaterial = useMemo(() => {
    // Base material - ocean/sea floor
    const oceanMaterial = new THREE.meshStandardMaterial({
      color: "#1e3a5f",  // Deep ocean blue
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    return oceanMaterial;
  }, []);

  // Create a debug visualization showing terrain types
  if (showDebug) {
    return (
      <group visible={visible}>
        <mesh geometry={terrainGeometry}>
          <meshStandardMaterial
            color="#88ccff"
            wireframe={true}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group visible={visible}>
      <mesh geometry={terrainGeometry} material={terrainMaterial} receiveShadow />
    </group>
  );
}