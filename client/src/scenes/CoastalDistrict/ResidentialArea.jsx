// Residential area component for Coastal District 001
// Phase 2: Roads and Town Layout
//
// Renders the residential neighborhood with houses, streets, and sidewalks.

import { useMemo } from "react";
import * as THREE from "three";
import { RESIDENTIAL, RESIDENTIAL_STREETS } from "./terrain.js";

// Residential house component
function House({ position, size = [8, 5, 10], color = "#a0522d" }) {
  return (
    <group position={position}>
      {/* Main house body */}
      <mesh receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, size[1] / 2 + 1, 0]} receiveShadow>
        <coneGeometry args={[Math.max(size[0], size[2]) / 2 + 0.5, 3, 4]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Street lamp component
function StreetLamp({ position }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 5, 8]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Lamp head */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 8]} />
        <meshStandardMaterial color="#555555" />
      </mesh>

      {/* Light */}
      <mesh position={[0, 4.5, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial
          color="#fff"
          emissive="#ffff99"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// Sidewalk component for residential streets
function ResidentialSidewalk({ start, end, width = 2 }) {
  const geometry = useMemo(() => {
    const length = Math.sqrt((end.x - start.x) ** 2 + (end.z - start.z) ** 2);
    return new THREE.BoxGeometry(length, width, 0.3);
  }, [start, end, width]);

  const position = useMemo(() => {
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    const angle = Math.atan2(end.z - start.z, end.x - start.x);

    return {
      position: [midX, -0.1, midZ],
      rotation: [0, angle, 0],
    };
  }, [start, end]);

  return (
    <mesh
      geometry={geometry}
      material={new THREE.meshStandardMaterial({
        color: "#e0e0e0",
        roughness: 0.9,
        metalness: 0,
      })}
      position={position.position}
      rotation={position.rotation}
    />
  );
}

// Generate residential houses along the streets
function generateHouses() {
  const houses = [];

  // Create houses for each residential street
  RESIDENTIAL_STREETS.forEach((street, streetIndex) => {
    const count = 8;  // Houses per street
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = street.start.x + t * (street.end.x - street.start.x) + (Math.random() - 0.5) * 4;
      const z = street.start.z + t * (street.end.z - street.start.z) + (Math.random() - 0.5) * 4;

      houses.push({
        position: [x, 3, z],
        size: [6 + Math.random() * 4, 4 + Math.random() * 3, 8 + Math.random() * 4],
        color: `hsl(${20 + Math.random() * 30}, ${70 + Math.random() * 20}%, ${60 + Math.random() * 20}%)`,
      });
    }
  });

  return houses;
}

// Generate street lamps along streets
function generateStreetLamps() {
  const lamps = [];

  RESIDENTIAL_STREETS.forEach((street, streetIndex) => {
    const lampCount = 4;
    for (let i = 0; i < lampCount; i++) {
      const t = i / (lampCount - 1);
      const x = street.start.x + t * (street.end.x - street.start.x);
      const z = street.start.z + t * (street.end.z - street.start.z);

      lamps.push({
        position: [x, 0, z],
      });
    }
  });

  return lamps;
}

export default function ResidentialArea() {
  const houses = useMemo(() => generateHouses(), []);
  const lamps = useMemo(() => generateStreetLamps(), []);

  return (
    <group name="residential-area">
      {/* Sidewalks */}
      {RESIDENTIAL_STREETS.map((street, i) => (
        <ResidentialSidewalk
          key={`sidewalk-${i}`}
          start={street.start}
          end={street.end}
        />
      ))}

      {/* Houses */}
      {houses.map((house, i) => (
        <House
          key={`house-${i}`}
          position={house.position}
          size={house.size}
          color={house.color}
        />
      ))}

      {/* Street lamps */}
      {lamps.map((lamp, i) => (
        <StreetLamp
          key={`lamp-${i}`}
          position={lamp.position}
        />
      ))}
    </group>
  );
}