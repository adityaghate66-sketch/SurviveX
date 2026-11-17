// Ocean and water bodies component for Coastal District 001
// Phase 1: Terrain and Geography
//
// Renders the Arabian Sea surrounding the coastal town.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { COASTLINE, WORLD_SIZE } from "./terrain.js";

export default function Ocean() {
  const waterRef = useRef();
  const waveUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWaveSpeed: { value: 0.5 },
    uWaveFrequency: { value: 2.0 },
    uWaveAmplitude: { value: 0.5 },
  }), []);

  // Create a large plane for the ocean
  const oceanGeometry = useMemo(() => {
    // Ocean extends beyond the world bounds
    const size = WORLD_SIZE * 1.5;
    const geometry = new THREE.PlaneGeometry(size, size, 64, 64);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);

  const oceanMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#1e3a5f",
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
  }, []);

  // Animate wave-like movement
  useFrame(({ clock }) => {
    waveUniforms.uTime.value = clock.getElapsedTime();

    if (waterRef.current) {
      // Gentle wave animation
      const time = clock.getElapsedTime();
      waterRef.current.material.uniforms = waveUniforms;

      // Pulsating effect for water
      waterRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <mesh ref={waterRef} geometry={oceanGeometry} material={oceanMaterial} receiveShadow />
  );
}