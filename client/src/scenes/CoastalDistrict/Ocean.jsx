// Ocean / Arabian Sea for Coastal District 001
// Phase 1: Terrain and Geography
//
// One large plane at sea level covers every place the heightfield drops below
// zero: the open sea in the south, the estuary and the harbour basin. The old
// version animated a material that had no uniforms; this one actually
// displaces a small vertex grid, which is cheap (under 2.5k vertices).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SEA_LEVEL, WORLD_SIZE } from "./terrain.js";

const SEA_SIZE = WORLD_SIZE * 1.8;
const SEA_SEGMENTS = 48;
const WATER_LEVEL = SEA_LEVEL + 0.03;

export default function Ocean() {
  const meshRef = useRef();

  const { geometry, basePositions } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SEA_SIZE, SEA_SIZE, SEA_SEGMENTS, SEA_SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    return {
      geometry: geo,
      basePositions: Float32Array.from(geo.attributes.position.array),
    };
  }, []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const positions = mesh.geometry.attributes.position;
    const time = clock.getElapsedTime();

    for (let i = 0; i < positions.count; i++) {
      const x = basePositions[i * 3];
      const z = basePositions[i * 3 + 2];
      const wave =
        Math.sin(x * 0.05 + time * 0.7) * 0.09 +
        Math.sin(z * 0.07 - time * 0.5) * 0.07;
      positions.setY(i, WATER_LEVEL + wave);
    }

    positions.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} name="ocean" renderOrder={-1}>
      <meshStandardMaterial
        color="#1c5d78"
        roughness={0.22}
        metalness={0.35}
        transparent
        opacity={0.94}
      />
    </mesh>
  );
}
