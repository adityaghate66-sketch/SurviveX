// Road network component for Coastal District 001
// Phase 2: Roads and Town Layout
//
// Renders all roads as visual meshes with appropriate materials.

import { useMemo } from "react";
import * as THREE from "three";
import {
  MAIN_ROAD,
  BEACH_PROMENADE,
  RIVER_BRIDGE,
  RESIDENTIAL_STREETS,
  SIDE_STREETS,
  BEACH_ACCESS_ROADS,
  ALL_ROADS,
  getRoadIntersections,
} from "./roads.js";

// Road material - asphalt gray
const ROAD_MATERIAL = new THREE.meshStandardMaterial({
  color: "#4a4a4a",
  roughness: 0.8,
  metalness: 0.1,
});

// Sidewalk material - concrete
const SIDEWALK_MATERIAL = new THREE.meshStandardMaterial({
  color: "#d0d0d0",
  roughness: 0.9,
  metalness: 0.05,
});

// Bridge material - concrete bridge
const BRIDGE_MATERIAL = new THREE.meshStandardMaterial({
  color: "#808080",
  roughness: 0.7,
  metalness: 0.2,
});

/**
 * Creates a road mesh from start to end points
 */
function RoadSegment({ start, end, width, material, y = 0 }) {
  const geometry = useMemo(() => {
    // Create a box geometry centered at origin
    const length = Math.sqrt(
      (end.x - start.x) ** 2 + (end.z - start.z) ** 2
    );

    const boxGeometry = new THREE.BoxGeometry(length, width, 0.5);
    return boxGeometry;
  }, [start, end, width]);

  const position = useMemo(() => {
    // Calculate midpoint
    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;

    // Calculate rotation angle
    const angle = Math.atan2(end.z - start.z, end.x - start.x);

    return {
      position: [midX, y, midZ],
      rotation: [0, angle, 0],
    };
  }, [start, end]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position.position}
      rotation={position.rotation}
      receiveShadow
    />
  );
}

/**
 * Creates a curved road (for roundabouts and winding roads)
 */
function CurvedRoadSegment({ points, width, material, y = 0 }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p.x, 0, p.z))
    );
    return new THREE.TubeGeometry(curve, 32, width / 2, 8, false);
  }, [points, width]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, y, 0]}
      receiveShadow
    />
  );
}

export default function Roads() {
  return (
    <group name="roads">
      {/* Main Coastal Highway */}
      <RoadSegment
        start={MAIN_ROAD.start}
        end={MAIN_ROAD.end}
        width={MAIN_ROAD.width}
        material={ROAD_MATERIAL}
      />

      {/* Beachfront Promenade */}
      <RoadSegment
        start={BEACH_PROMENADE.start}
        end={BEACH_PROMENADE.end}
        width={BEACH_PROMENADE.width}
        material={SIDEWALK_MATERIAL}
      />

      {/* River Bridge */}
      <RoadSegment
        start={RIVER_BRIDGE.start}
        end={RIVER_BRIDGE.end}
        width={RIVER_BRIDGE.width}
        material={BRIDGE_MATERIAL}
        y={RIVER_BRIDGE.elevation}
      />

      {/* Residential Streets */}
      {RESIDENTIAL_STREETS.map((street, i) => (
        <RoadSegment
          key={`res-${i}`}
          start={street.start}
          end={street.end}
          width={street.width}
          material={ROAD_MATERIAL}
        />
      ))}

      {/* Side Streets */}
      {SIDE_STREETS.map((street, i) => (
        <RoadSegment
          key={`side-${i}`}
          start={street.start}
          end={street.end}
          width={street.width}
          material={ROAD_MATERIAL}
        />
      ))}

      {/* Beach Access Roads */}
      {BEACH_ACCESS_ROADS.map((road, i) => (
        <RoadSegment
          key={`beach-access-${i}`}
          start={road.start}
          end={road.end}
          width={road.width}
          material={ROAD_MATERIAL}
        />
      ))}
    </group>
  );
}

// Export helper for getting all intersections
export { getRoadIntersections };