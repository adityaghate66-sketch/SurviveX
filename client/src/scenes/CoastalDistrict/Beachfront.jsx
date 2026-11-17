// Beachfront and commercial area component for Coastal District 001
// Phase 2: Roads and Town Layout
//
// Renders the southwest beach area with hotels and the southeast harbour.

import { useMemo } from "react";
import * as THREE from "three";
import { BEACH, HARBOR, BEACH_ACCESS_ROADS, RIVER_BRIDGE } from "./terrain.js";

// Hotel building component
function Hotel({ position, size = [15, 6, 20], name = "Hotel" }) {
  return (
    <group position={position}>
      {/* Main building */}
      <mesh receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#cd853f" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, size[1] / 2 + 1, 0]} receiveShadow>
        <coneGeometry args={[Math.max(size[0], size[2]) / 2 + 0.5, 4, 4]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>

      {/* Balconies */}
      <group position={[0, size[1] / 2 + 0.5, -size[2] / 2 - 0.3]}>
        <mesh>
          <boxGeometry args={[size[0] - 2, 0.5, 0.5]} />
          <meshStandardMaterial color="#d2b48c" />
        </mesh>
      </group>
    </group>
  );
}

// Beach shack component
function BeachShack({ position, size = [5, 3, 4] }) {
  return (
    <group position={position}>
      <mesh receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#d4a574" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

// Harbour dock component
function HarborDock({ position, orientation = "east" }) {
  const length = 30;
  const width = 8;

  // Dock planks
  const planks = [];
  for (let i = 0; i < 10; i++) {
    planks.push(
      <mesh
        key={`plank-${i}`}
        position={[i * (length / 10 - 0.5), 0.1, 0]}
        rotation={[0, orientation === "east" ? 0 : Math.PI / 2, 0]}
      >
        <boxGeometry args={[length / 10, 0.2, width]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>
    );
  }

  return <group position={position}>{planks}</group>;
}

// Fish market stall
function FishMarketStall({ position }) {
  return (
    <group position={position}>
      {/* Stall structure */}
      <mesh receiveShadow>
        <boxGeometry args={[6, 3, 4]} />
        <meshStandardMaterial color="#c19a6b" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Tent roof */}
      <mesh position={[0, 2.5, 0]} receiveShadow>
        <coneGeometry args={[3, 2, 4]} />
        <meshStandardMaterial color="#ff6347" transparent opacity={0.7} roughness={0.5} />
      </mesh>

      {/* Fishing nets/poles */}
      <mesh position={[3, 1.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 2, 8]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    </group>
  );
}

// Fishing boat in harbor
function FishingBoat({ position, size = [8, 2, 25] }) {
  return (
    <group position={position}>
      {/* Boat hull */}
      <mesh receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#4682b4" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Mast */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    </group>
  );
}

// Beach umbrella
function BeachUmbrella({ position }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh>
        <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
        <meshStandardMaterial color="#7a7a7a" />
      </mesh>

      {/* Canopy */}
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[2, 1.5, 4, 8]} />
        <meshStandardMaterial color="#ff4500" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// Generate beach hotels along the promenade
function generateHotels() {
  const hotels = [];

  // Three hotels along the beachfront
  const hotelPositions = [
    { x: -200, z: -350 },
    { x: -60, z: -350 },
    { x: 80, z: -350 },
  ];

  hotelPositions.forEach((pos, i) => {
    hotels.push({
      position: [pos.x, 2, pos.z - 2 + i * 60],
      size: [12 + i * 2, 5, 16 + i * 4],
    });
  });

  return hotels;
}

// Generate beach shacks
function generateBeachShacks() {
  const shacks = [];
  for (let i = 0; i < 6; i++) {
    shacks.push({
      position: [-150 + i * 40, 1, -380],
      size: [4 + Math.random() * 2, 2 + Math.random(), 3 + Math.random() * 2],
    });
  }
  return shacks;
}

// Generate harbor infrastructure
function generateHarbor() {
  const docks = [];
  const boats = [];
  const stalls = [];

  // Docks along the harbour perimeter
  const dockPositions = [
    { x: HARBOR.CENTER.x - 40, z: HARBOR.CENTER.z },
    { x: HARBOR.CENTER.x + 40, z: HARBOR.CENTER.z },
    { x: HARBOR.CENTER.x, z: HARBOR.CENTER.z - 60 },
  ];

  dockPositions.forEach((pos, i) => {
    docks.push(pos);
  });

  // Some fishing boats
  for (let i = 0; i < 5; i++) {
    boats.push({
      position: [HARBOR.CENTER.x + (Math.random() - 0.5) * 40, -1.5, HARBOR.CENTER.z + (Math.random() - 0.5) * 30],
    });
  }

  // Fish market stalls near harbour entrance
  for (let i = 0; i < 8; i++) {
    stalls.push({
      position: [HARBOR.CENTER.x + 30, 0, HARBOR.CENTER.z - 20 + i * 10],
    });
  }

  return { docks, boats, stalls };
}

// Generate beach amenities
function generateBeachAmenities() {
  const umbrellas = [];
  for (let i = 0; i < 20; i++) {
    umbrellas.push({
      position: [-180 + (i % 10) * 4, 0.5, -400 + Math.floor(i / 10) * 4],
    });
  }
  return umbrellas;
}

export default function Beachfront() {
  const hotels = useMemo(() => generateHotels(), []);
  const shacks = useMemo(() => generateBeachShacks(), []);
  const harbor = useMemo(() => generateHarbor(), []);
  const umbrellas = useMemo(() => generateBeachAmenities(), []);

  return (
    <group name="beachfront">
      {/* Hotels along the beach */}
      {hotels.map((hotel, i) => (
        <Hotel
          key={`hotel-${i}`}
          position={hotel.position}
          size={hotel.size}
        />
      ))}

      {/* Beach shacks */}
      {shacks.map((shack, i) => (
        <BeachShack
          key={`shack-${i}`}
          position={shack.position}
          size={shack.size}
        />
      ))}

      {/* Harbor area */}
      <group name="harbor">
        {harbor.docks.map((dock, i) => (
          <HarborDock
            key={`dock-${i}`}
            position={dock}
          />
        ))}
      </group>

      {/* Fishing boats */}
      {harbor.boats.map((boat, i) => (
        <FishingBoat
          key={`boat-${i}`}
          position={boat.position}
        />
      ))}

      {/* Fish market stalls */}
      {harbor.stalls.map((stall, i) => (
        <FishMarketStall
          key={`stall-${i}`}
          position={stall.position}
        />
      ))}

      {/* Beach umbrellas */}
      {umbrellas.map((umbrella, i) => (
        <BeachUmbrella
          key={`umbrella-${i}`}
          position={umbrella.position}
        />
      ))}

      {/* Beach access paths */}
      {BEACH_ACCESS_ROADS.map((road, i) => (
        <mesh key={`beach-path-${i}`} receiveShadow>
          <boxGeometry args={[3, 0.2, Math.sqrt(
            (road.end.x - road.start.x) ** 2 +
            (road.end.z - road.start.z) ** 2
          )]} />
          <meshStandardMaterial color="#d4c8a1" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}