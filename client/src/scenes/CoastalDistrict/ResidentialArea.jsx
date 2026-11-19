// Residential neighbourhood for Coastal District 001
// Phase 2: Roads and Town Layout
//
// Layout massing only: houses and street lamps placed against the terrain and
// set back from the road, so the street reads as a street. Detailed facades,
// balconies and compound walls are Phase 3/4 work.
//
// Fixes from the previous version:
//   - imported RESIDENTIAL_STREETS from terrain.js, which never exported it
//   - houses were spawned on the road centre line and at a fixed y = 3, i.e.
//     buried 15m under the northern slopes
//   - a fresh material was created for every sidewalk mesh

import { useMemo } from "react";
import * as THREE from "three";
import { getMeshHeight } from "./terrain.js";
import { RESIDENTIAL_STREETS } from "./roads.js";

// Shared materials (one allocation for the whole neighbourhood).
const WALL_COLORS = ["#e8cfa8", "#e3bda4", "#dcc9a2", "#efd7b6", "#cfa47c", "#e6c3b0"];
const WALL_MATERIALS = WALL_COLORS.map(
  (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 })
);
const ROOF_MATERIAL = new THREE.MeshStandardMaterial({ color: "#9c4f33", roughness: 0.9, metalness: 0 });
const PLINTH_MATERIAL = new THREE.MeshStandardMaterial({ color: "#9a8f7c", roughness: 1, metalness: 0 });
const POLE_MATERIAL = new THREE.MeshStandardMaterial({ color: "#3a3f42", roughness: 0.6, metalness: 0.4 });
const BULB_MATERIAL = new THREE.MeshStandardMaterial({
  color: "#fff6d5",
  emissive: "#ffe9a8",
  emissiveIntensity: 1.4,
  roughness: 0.4,
});

// Deterministic RNG so the layout does not reshuffle between reloads (which
// would also make the layout tests flaky).
function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function House({ x, z, width, depth, height, wallIndex, rotation = 0 }) {
  const ground = getMeshHeight(x, z);

  return (
    <group position={[x, ground, z]} rotation={[0, rotation, 0]}>
      {/* Plinth: sunk into the slope so a house on sloping ground never floats. */}
      <mesh position={[0, 0.1, 0]} material={PLINTH_MATERIAL} receiveShadow castShadow>
        <boxGeometry args={[width + 0.6, 1.4, depth + 0.6]} />
      </mesh>

      {/* Body */}
      <mesh position={[0, height / 2 + 0.5, 0]} material={WALL_MATERIALS[wallIndex]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>

      {/* Hip roof, rotated so its four faces align with the walls. */}
      <mesh position={[0, height + 0.5 + 1.1, 0]} rotation={[0, Math.PI / 4, 0]} material={ROOF_MATERIAL} castShadow>
        <coneGeometry args={[Math.hypot(width, depth) / 2 + 0.4, 2.2, 4]} />
      </mesh>
    </group>
  );
}

function StreetLamp({ x, z }) {
  const ground = getMeshHeight(x, z);
  return (
    <group position={[x, ground, z]}>
      <mesh position={[0, 2.5, 0]} material={POLE_MATERIAL} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 5, 8]} />
      </mesh>
      <mesh position={[0.35, 4.95, 0]} rotation={[0, 0, Math.PI / 2]} material={POLE_MATERIAL}>
        <cylinderGeometry args={[0.06, 0.06, 0.9, 6]} />
      </mesh>
      <mesh position={[0.8, 4.8, 0]} material={BULB_MATERIAL}>
        <sphereGeometry args={[0.28, 12, 10]} />
      </mesh>
    </group>
  );
}

function generateLayout() {
  const rng = createRng(20261);
  const houses = [];
  const lamps = [];

  RESIDENTIAL_STREETS.forEach((street) => {
    // Our residential streets run east-west, so the setback is along z.
    const setback = street.width / 2 + 5.5;
    const xs = [-122, -94, -66, -38, 20, 46];

    xs.forEach((x, index) => {
      for (const side of [-1, 1]) {
        // Leave the junction with the town spine (x = 0) clear.
        if (Math.abs(x) < 22) continue;

        const jitterX = (rng() - 0.5) * 3;
        const jitterZ = (rng() - 0.5) * 2;
        houses.push({
          x: x + jitterX,
          z: street.waypoints[1].z + side * setback + jitterZ,
          width: 7 + rng() * 4,
          depth: 8 + rng() * 4,
          height: 4.2 + rng() * 2.6,
          wallIndex: Math.floor(rng() * WALL_MATERIALS.length),
          rotation: side > 0 ? Math.PI : 0,
          key: `${street.name}-${index}-${side}`,
        });
      }
    });

    // Lamps on the south shoulder, roughly every 40m.
    for (let x = -110; x <= 40; x += 40) {
      lamps.push({ x, z: street.waypoints[1].z - setback + 1, key: `${street.name}-lamp-${x}` });
    }
  });

  // Church cross street: a few houses on its east side, facing the road.
  for (let z = 150; z <= 250; z += 34) {
    houses.push({
      x: 68 + rng() * 2,
      z,
      width: 7 + rng() * 3,
      depth: 8 + rng() * 3,
      height: 4.5 + rng() * 2,
      wallIndex: Math.floor(rng() * WALL_MATERIALS.length),
      rotation: -Math.PI / 2,
      key: `cross-${z}`,
    });
  }

  return { houses, lamps };
}

export default function ResidentialArea() {
  const { houses, lamps } = useMemo(() => generateLayout(), []);

  return (
    <group name="residential-area">
      {houses.map((house) => (
        <House
          key={house.key}
          x={house.x}
          z={house.z}
          width={house.width}
          depth={house.depth}
          height={house.height}
          wallIndex={house.wallIndex}
          rotation={house.rotation}
        />
      ))}

      {lamps.map((lamp) => (
        <StreetLamp key={lamp.key} x={lamp.x} z={lamp.z} />
      ))}
    </group>
  );
}
