import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hazardsRegistry } from "../game/hazards.js";

// Simple smoke cloud visual for hazards
export function SmokeCloud({ hazard }) {
  const meshRef = useRef();

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !hazard?.active) return;

    // Driven by the frame clock, not React state: re-rendering 60 times a
    // second just to bob a mesh would starve the rest of the game.
    const baseY = hazard.position.y + 1;
    mesh.position.y = baseY + Math.sin(clock.getElapsedTime() * 2) * 0.05;
    mesh.rotation.y += delta * 0.1;
  });

  if (!hazard?.active) return null;

  const { opacity, density } = hazard.getSmokeEffect();
  const size = 0.3 + density * 0.5;

  return (
    <mesh
      ref={meshRef}
      position={[hazard.position.x, hazard.position.y + 1, hazard.position.z]}
    >
      <sphereGeometry args={[size, 8, 6]} />
      <meshStandardMaterial
        color="#64748b"
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// Drives smoke particle physics from inside the R3F frame loop.
export default function ParticleSystem() {
  useFrame((state, delta) => {
    if (!hazardsRegistry.particleSystem.active) return;
    hazardsRegistry.particleSystem.update(delta);
  });

  return null;
}
