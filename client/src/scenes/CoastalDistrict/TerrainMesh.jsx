// Terrain mesh for Coastal District 001
// Phase 1: Terrain and Geography (corrected in Phase 2)
//
// Renders the heightfield that every other component is positioned against.
// A single vertex-coloured geometry covers the whole 800m x 800m world: sand on
// the coast, green plains inland, rock on the steep hill flanks and a darker
// seabed under the water. That costs one draw call and no textures, which keeps
// the browser build cheap while still reading as a real coastline.

import { useMemo } from "react";
import * as THREE from "three";
import {
  WORLD_SIZE,
  TERRAIN_SEGMENTS,
  getTerrainHeight,
  getSlope,
  getTerrainType,
  groundVariation,
  hillHeight,
  clamp01,
} from "./terrain.js";

// Palette. Kept together so the environment has one colour language.
const COLORS = {
  seabed: new THREE.Color("#5e6b52"),
  wetSand: new THREE.Color("#c9b98f"),
  sand: new THREE.Color("#e4d3a8"),
  riverbank: new THREE.Color("#5f7449"),
  grass: new THREE.Color("#5d8046"),
  grassDry: new THREE.Color("#7d8a4e"),
  hillGrass: new THREE.Color("#4a7339"),
  rock: new THREE.Color("#8a8272"),
};

const colorScratch = new THREE.Color();

function colorAt(x, z) {
  const type = getTerrainType(x, z);
  const slope = getSlope(x, z);
  const variation = groundVariation(x, z);
  const jitter = (variation - 0.5) * 0.1;

  if (type === "ocean") {
    colorScratch.copy(COLORS.seabed);
  } else if (type === "beach") {
    const wetness = clamp01((z + 300) / 25); // darker wet sand near the surf
    colorScratch.copy(COLORS.wetSand).lerp(COLORS.sand, wetness);
  } else if (type === "river") {
    colorScratch.copy(COLORS.riverbank);
  } else if (type === "harbour") {
    colorScratch.copy(COLORS.seabed).lerp(COLORS.sand, 0.35);
  } else if (type === "hills" || hillHeight(x, z) > 2) {
    colorScratch.copy(COLORS.grass).lerp(COLORS.hillGrass, clamp01(hillHeight(x, z) / 60));
  } else {
    // Low coastal plain: slightly drier grass away from the river.
    colorScratch.copy(COLORS.grass).lerp(COLORS.grassDry, 0.35 + variation * 0.3);
  }

  // Exposed rock where the ground is steep (hill flanks, river banks).
  if (slope > 0.45) {
    colorScratch.lerp(COLORS.rock, clamp01((slope - 0.45) / 0.5));
  }

  colorScratch.offsetHSL(0, 0, jitter);
  return colorScratch;
}

export default function TerrainMesh({ visible = true, showDebug = false }) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      WORLD_SIZE,
      WORLD_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS
    );

    // Three.js planes are XY by default; lay it flat so Y is height.
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);

      const height = getTerrainHeight(vertex.x, vertex.z);
      positions.setY(i, height);

      // Colour is sampled at the vertex; geometry is dense enough (8m cells)
      // that this reads as a gradient rather than flat facets.
      const color = colorAt(vertex.x, vertex.z);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    return geo;
  }, []);

  if (showDebug) {
    return (
      <mesh geometry={geometry} visible={visible}>
        <meshStandardMaterial color="#88ccff" wireframe transparent opacity={0.35} />
      </mesh>
    );
  }

  return (
    <mesh geometry={geometry} visible={visible} receiveShadow name="terrain">
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}
