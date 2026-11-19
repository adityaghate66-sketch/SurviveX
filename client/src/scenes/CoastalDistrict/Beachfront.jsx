// Beachfront and harbour for Coastal District 001
// Phase 2: Roads and Town Layout
//
// Layout massing for the southwest beachfront (hotels, shacks, umbrellas) and
// the southeast fishing harbour (quay, docks, boats, fish market).
//
// Fixes from the previous version:
//   - imported BEACH_ACCESS_ROADS / RIVER_BRIDGE from terrain.js, which never
//     exported them (module error)
//   - every prop used a hard-coded y, so hotels floated over the sand and the
//     harbour sat in the middle of an inland pit
//   - the "beach access paths" were unpositioned boxes stacked at the origin

import { useMemo } from "react";
import * as THREE from "three";
import { HARBOR, SEA_LEVEL, getMeshHeight } from "./terrain.js";
import { HARBOUR_QUAY } from "./roads.js";

const MATERIALS = {
  hotelA: new THREE.MeshStandardMaterial({ color: "#eedfc4", roughness: 0.85, metalness: 0 }),
  hotelB: new THREE.MeshStandardMaterial({ color: "#e4c9ab", roughness: 0.85, metalness: 0 }),
  hotelC: new THREE.MeshStandardMaterial({ color: "#dfd3bb", roughness: 0.85, metalness: 0 }),
  hotelTrim: new THREE.MeshStandardMaterial({ color: "#f7f2e7", roughness: 0.8, metalness: 0 }),
  roof: new THREE.MeshStandardMaterial({ color: "#a85a3f", roughness: 0.9, metalness: 0 }),
  plinth: new THREE.MeshStandardMaterial({ color: "#9a8f7c", roughness: 1, metalness: 0 }),
  shackWall: new THREE.MeshStandardMaterial({ color: "#d4a574", roughness: 0.9, metalness: 0 }),
  shackRoof: new THREE.MeshStandardMaterial({ color: "#c98b52", roughness: 0.9, metalness: 0 }),
  wood: new THREE.MeshStandardMaterial({ color: "#8b6b45", roughness: 0.9, metalness: 0 }),
  boatHull: new THREE.MeshStandardMaterial({ color: "#3f6f96", roughness: 0.6, metalness: 0.15 }),
  boatTrim: new THREE.MeshStandardMaterial({ color: "#e8e4d8", roughness: 0.7, metalness: 0 }),
  canvasRed: new THREE.MeshStandardMaterial({
    color: "#c9553f",
    roughness: 0.8,
    metalness: 0,
    side: THREE.DoubleSide,
  }),
  canvasYellow: new THREE.MeshStandardMaterial({
    color: "#e0a83c",
    roughness: 0.8,
    metalness: 0,
    side: THREE.DoubleSide,
  }),
  stallWood: new THREE.MeshStandardMaterial({ color: "#b08a5c", roughness: 0.9, metalness: 0 }),
};

const HOTEL_MATERIALS = [MATERIALS.hotelA, MATERIALS.hotelB, MATERIALS.hotelC];
const WATER_LINE = SEA_LEVEL + 0.05;

// Hotels sit on the coastal plain facing the sea.
function Hotel({ x, z, width, depth, storeys, materialIndex }) {
  const ground = getMeshHeight(x, z);
  const floorHeight = 3.4;
  const height = storeys * floorHeight;

  return (
    <group position={[x, ground, z]}>
      <mesh position={[0, 0.2, 0]} material={MATERIALS.plinth} receiveShadow castShadow>
        <boxGeometry args={[width + 1.2, 1.6, depth + 1.2]} />
      </mesh>

      <mesh position={[0, height / 2 + 0.6, 0]} material={HOTEL_MATERIALS[materialIndex % 3]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>

      {/* Balcony bands, one per floor. Reads as a beachfront hotel at distance. */}
      {Array.from({ length: storeys }).map((_, floor) => (
        <mesh
          key={`band-${floor}`}
          position={[0, 0.6 + floor * floorHeight + floorHeight * 0.55, -depth / 2 - 0.35]}
          material={MATERIALS.hotelTrim}
          castShadow
        >
          <boxGeometry args={[width - 1.5, 0.28, 0.9]} />
        </mesh>
      ))}

      <mesh position={[0, height + 1.3, 0]} rotation={[0, Math.PI / 4, 0]} material={MATERIALS.roof} castShadow>
        <coneGeometry args={[Math.hypot(width, depth) / 2 + 0.5, 2.4, 4]} />
      </mesh>
    </group>
  );
}

function BeachShack({ x, z, width, depth, height, roofMaterial }) {
  const ground = getMeshHeight(x, z);
  return (
    <group position={[x, ground, z]}>
      <mesh position={[0, height / 2, 0]} material={MATERIALS.shackWall} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      <mesh position={[0, height + 0.35, 0]} rotation={[0.12, 0, 0]} material={roofMaterial} castShadow>
        <boxGeometry args={[width + 1.2, 0.14, depth + 1.4]} />
      </mesh>
    </group>
  );
}

function BeachUmbrella({ x, z, colorMaterial }) {
  const ground = getMeshHeight(x, z);
  return (
    <group position={[x, ground, z]}>
      <mesh position={[0, 1.1, 0]} material={MATERIALS.wood}>
        <cylinderGeometry args={[0.06, 0.06, 2.2, 8]} />
      </mesh>
      <mesh position={[0, 2.3, 0]} rotation={[0, Math.PI / 8, 0]} material={colorMaterial} castShadow>
        <coneGeometry args={[1.9, 0.9, 10, 1, true]} />
      </mesh>
    </group>
  );
}

// Docks run from the quay out into the harbour basin.
function HarborDock({ from, to, planks = 14 }) {
  const pieces = useMemo(() => {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const results = [];

    for (let i = 0; i < planks; i++) {
      const t = (i + 0.5) / planks;
      results.push({
        key: i,
        x: from.x + dx * t,
        z: from.z + dz * t,
        angle,
        width: length / planks - 0.12,
      });
    }

    return results;
  }, [from, to, planks]);

  return (
    <group>
      {pieces.map((piece) => (
        <mesh
          key={piece.key}
          position={[piece.x, WATER_LINE + 0.55, piece.z]}
          rotation={[0, piece.angle, 0]}
          material={MATERIALS.wood}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[3.2, 0.22, piece.width]} />
        </mesh>
      ))}

      {/* Support posts */}
      {pieces
        .filter((_, index) => index % 3 === 0)
        .map((piece) => (
          <mesh key={`post-${piece.key}`} position={[piece.x, WATER_LINE - 0.1, piece.z]} material={MATERIALS.wood}>
            <cylinderGeometry args={[0.14, 0.14, 1.4, 6]} />
          </mesh>
        ))}
    </group>
  );
}

function FishingBoat({ x, z, rotation }) {
  return (
    <group position={[x, WATER_LINE - 0.35, z]} rotation={[0, rotation, 0]}>
      <mesh material={MATERIALS.boatHull} castShadow>
        <boxGeometry args={[2.6, 1.2, 7.5]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} material={MATERIALS.boatTrim}>
        <boxGeometry args={[2.75, 0.18, 7.7]} />
      </mesh>
      <mesh position={[0.2, 1.9, -1.6]} material={MATERIALS.wood}>
        <cylinderGeometry args={[0.07, 0.09, 3.8, 6]} />
      </mesh>
    </group>
  );
}

function FishMarketStall({ x, z, rotation, canopyMaterial }) {
  const ground = getMeshHeight(x, z);
  return (
    <group position={[x, ground, z]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.55, 0]} material={MATERIALS.stallWood} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.1, 2.2]} />
      </mesh>
      {[-1.5, 1.5].map((offsetX) => (
        <mesh key={`post-${offsetX}`} position={[offsetX, 1.4, 0]} material={MATERIALS.wood}>
          <cylinderGeometry args={[0.07, 0.07, 2.2, 6]} />
        </mesh>
      ))}
      <mesh position={[0, 2.55, 0]} rotation={[0.08, 0, 0]} material={canopyMaterial} castShadow>
        <boxGeometry args={[4.2, 0.12, 2.8]} />
      </mesh>
    </group>
  );
}

export default function Beachfront() {
  const layout = useMemo(() => {
    // Hotels: three blocks behind the promenade, facing the sea.
    const hotels = [
      { x: -250, z: -230, width: 16, depth: 14, storeys: 4, materialIndex: 0 },
      { x: -170, z: -226, width: 13, depth: 12, storeys: 3, materialIndex: 1 },
      { x: -75, z: -228, width: 14, depth: 13, storeys: 4, materialIndex: 2 },
      { x: 25, z: -224, width: 12, depth: 12, storeys: 2, materialIndex: 1 },
    ];

    // Beach shacks on the sand between the promenade and the surf.
    const shacks = [-215, -175, -135, -60, -10, 55].map((x, index) => ({
      x,
      z: -268 - (index % 2) * 5,
      width: 5.4,
      depth: 4.2,
      height: 2.6 + (index % 3) * 0.25,
      roofMaterial: index % 2 === 0 ? MATERIALS.canvasYellow : MATERIALS.canvasRed,
    }));

    const umbrellas = [];
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 12; i++) {
        umbrellas.push({
          x: -270 + i * 24 + (row % 2) * 10,
          z: -282 - row * 6,
          colorMaterial: (row + i) % 2 === 0 ? MATERIALS.canvasRed : MATERIALS.canvasYellow,
        });
      }
    }

    // Harbour geometry is derived from the quay point so the docks always
    // start on land and reach into the water.
    const quay = HARBOUR_QUAY;
    const dx = HARBOR.CENTER.x - quay.x;
    const dz = HARBOR.CENTER.z - quay.z;
    const length = Math.hypot(dx, dz) || 1;
    const ux = dx / length;
    const uz = dz / length;
    const px = -uz;
    const pz = ux;

    const docks = [-2, 0, 2].map((step) => {
      const offsetX = px * step * 12;
      const offsetZ = pz * step * 12;
      return {
        from: { x: quay.x + offsetX, z: quay.z + offsetZ },
        to: { x: quay.x + offsetX + ux * 26, z: quay.z + offsetZ + uz * 26 },
      };
    });

    const boats = [-18, -6, 8, 20].map((offset, index) => ({
      x: quay.x + ux * 44 + px * offset,
      z: quay.z + uz * 44 + pz * offset,
      rotation: Math.atan2(ux, uz) + (index % 2 === 0 ? 0.2 : -0.15),
    }));

    const stalls = [-10, -3.4, 3.2, 10].map((offset, index) => ({
      x: quay.x - ux * 10 + px * offset * 1.6,
      z: quay.z - uz * 10 + pz * offset * 1.6,
      rotation: Math.atan2(ux, uz) + Math.PI,
      canopyMaterial: index % 2 === 0 ? MATERIALS.canvasRed : MATERIALS.canvasYellow,
    }));

    return { hotels, shacks, umbrellas, docks, boats, stalls };
  }, []);

  return (
    <group name="beachfront">
      {layout.hotels.map((hotel) => (
        <Hotel key={`hotel-${hotel.x}`} {...hotel} />
      ))}

      {layout.shacks.map((shack) => (
        <BeachShack key={`shack-${shack.x}`} {...shack} />
      ))}

      {layout.umbrellas.map((umbrella) => (
        <BeachUmbrella key={`umbrella-${umbrella.x}-${umbrella.z}`} {...umbrella} />
      ))}

      <group name="harbour">
        {layout.docks.map((dock, index) => (
          <HarborDock key={`dock-${index}`} from={dock.from} to={dock.to} />
        ))}

        {layout.boats.map((boat, index) => (
          <FishingBoat key={`boat-${index}`} {...boat} />
        ))}

        {layout.stalls.map((stall, index) => (
          <FishMarketStall key={`stall-${index}`} {...stall} />
        ))}
      </group>
    </group>
  );
}
