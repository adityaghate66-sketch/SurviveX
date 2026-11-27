// Fire hazard component for Coastal District 001
// Phase 4: Active Hazard System (Fire Simulation)
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { hazardsRegistry } from "../../game/hazards";

// Deterministic pseudo-random value so particle generation stays pure and a
// re-render does not reshuffle the fire visuals.
function seededRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// Fire hazard entity for coastal areas (e.g., campfires, brazier fires, electrical fires)
export default function FireHazard({
  id = "coastal-fire",
  position = [0, 0, 0],
  intensity = 1.0,
  maxSpreadZones = 3,
}) {
  const [x, y, z] = position;

  useEffect(() => {
    if (!hazardsRegistry.getHazard(id)) {
      hazardsRegistry.addHazard(id, new THREE.Vector3(x, y, z), {
        maxSpreadZones,
        baseIntensity: intensity,
      });
    }

    return () => hazardsRegistry.removeHazard(id);
  }, [id, intensity, maxSpreadZones, x, y, z]);

  useFrame((_state, delta) => {
    const hazard = hazardsRegistry.getHazard(id);
    if (hazard && hazard.active) {
      hazard.update(delta);
    }
  });

  // Visual fire effect using Three.js points
  const fireGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const particleCount = 100 + Math.floor(intensity * 200);
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Radial distribution around position with upward bias
      const theta = seededRandom(i * 4 + 1) * Math.PI * 2;
      const phi = seededRandom(i * 4 + 2) * (Math.PI / 2);
      const radius = 0.5 + seededRandom(i * 4 + 3) * 1.5 * intensity;

      positions[i * 3] = x + Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = y + Math.cos(phi) * radius + seededRandom(i * 4 + 4) * 0.5;
      positions[i * 3 + 2] = z + Math.cos(phi) * Math.sin(theta) * radius;

      sizes[i] = 0.1 + seededRandom(i * 4 + 5) * 0.2;
      opacities[i] = 0.5 + seededRandom(i * 4 + 6) * 0.5;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));
    return geometry;
  }, [intensity, x, y, z]);

  const fireMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color().setHSL(0, 0.8, 0.5 + intensity * 0.3),
        size: 0.2 + intensity * 0.3,
        opacity: 0.8 + intensity * 0.2,
        transparent: true,
        sizeAttenuation: true,
      }),
    [intensity]
  );

  useEffect(
    () => () => {
      fireGeometry.dispose();
      fireMaterial.dispose();
    },
    [fireGeometry, fireMaterial]
  );

  return (
    <group position={position}>
      <points geometry={fireGeometry} material={fireMaterial} receiveShadow />
    </group>
  );
}
