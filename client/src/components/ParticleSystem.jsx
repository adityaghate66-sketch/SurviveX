import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hazardsRegistry } from "../game/hazards.js";

// Simple smoke cloud visual for hazards
export function SmokeCloud({ hazard }) {
  const meshRef = useRef();
  const [time, setTime] = useState(0);

  useFrame(({ clock }, delta) => {
    setTime(t => t + delta);
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y += Math.sin(time * 2) * 0.001;
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  if (!hazard?.active) return null;

  const { opacity, density } = hazard.getSmokeEffect();
  const size = 0.3 + density * 0.5;

  return (
    <mesh ref={meshRef}>
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

// Hook to access particle system in any component
export function useParticleSystem() {
  const [emitting, setEmitting] = useState(false);
  const [particleCount, setParticleCount] = useState(0);

  const emit = useCallback((position, count = 10) => {
    const particles = hazardsRegistry.particleSystem.emit(position, count);
    setParticleCount(prev => prev + count);
    setEmitting(true);
    return particles;
  }, []);

  const clear = useCallback(() => {
    hazardsRegistry.particleSystem.reset();
    setEmitting(false);
    setParticleCount(0);
  }, []);

  // Update particle count every frame
  useFrame(() => {
    setParticleCount(hazardsRegistry.particleSystem.getActiveParticles().length);
  });

  return { emitting, particleCount, emit, clear };
}

// Main particle system component for instancing
export default function ParticleSystem() {
  const groupRef = useRef();

  useFrame(({ clock }, deltaTime) => {
    if (!hazardsRegistry.particleSystem.active) return;

    // Update particle system physics
    hazardsRegistry.particleSystem.update(deltaTime);
  });

  return null;
}