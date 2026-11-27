// Generic building component for Coastal District 001
// Phase 3: Buildings and Architecture
//
// Reusable building component with various architectural styles.

import { Fragment, useMemo } from "react";
import * as THREE from "three";

/**
 * Base building with walls, roof, and optional features
 */
export default function Building({
  position,
  size = [10, 5, 12],
  style = "portuguese",
  features = [],
  materialOverrides = {},
}) {
  const buildingColor = materialOverrides.baseColor || getBaseColor(style);
  const roofColor = materialOverrides.roofColor || getRoofColor(style);

  // Generate building geometry
  const wallGeometry = useMemo(() => {
    return new THREE.BoxGeometry(size[0], size[1], size[2]);
  }, [size]);

  const wallMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: buildingColor,
      roughness: 0.7,
      metalness: 0.1,
      ...materialOverrides,
    });
  }, [buildingColor, materialOverrides]);

  // Four-sided hip roof: base sits flush with the top of the walls.
  const roofHeight = 1.5 + size[1] * 0.2;
  const roofRadius = Math.max(size[0], size[2]) / 2 + 0.5;

  return (
    <group position={position}>
      {/* Main building body */}
      <mesh geometry={wallGeometry} material={wallMaterial} castShadow receiveShadow />

      {/* Roof */}
      <mesh
        rotation={[0, Math.PI / 4, 0]}
        position={[0, size[1] / 2 + roofHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[roofRadius, roofHeight, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Optional features rendered by child components */}
      {features.map((feature, i) => (
        <Fragment key={i}>
          {feature.type === "balcony" && (
            <Balcony position={feature.position} size={feature.size} color={feature.color} />
          )}
          {feature.type === "column" && (
            <Column position={feature.position} height={feature.height} color={feature.color} />
          )}
          {feature.type === "window" && (
            <Window position={feature.position} size={feature.size} color={feature.color} />
          )}
        </Fragment>
      ))}
    </group>
  );
}

// Helper function to get base color by style
function getBaseColor(style) {
  const colors = {
    portuguese: "#cd853f",
    modern: "#e0c097",
    resort: "#f4a460",
    industrial: "#696969",
    market: "#ff6347",
  };
  return colors[style] || colors.portuguese;
}

// Helper function to get roof color by style
function getRoofColor(style) {
  const colors = {
    portuguese: "#8b4513",
    modern: "#2f4f4f",
    resort: "#cd853f",
    industrial: "#2f4f4f",
    market: "#ffd700",
  };
  return colors[style] || colors.portuguese;
}

// Balcony component
function Balcony({ position, size = [3, 1, 0.5], color = "#d2b48c" }) {
  return (
    <group position={position}>
      {/* Balcony floor */}
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      {/* Railings */}
      {[-size[0] / 2 + 0.3, size[0] / 2 - 0.3].map((x, i) => (
        <mesh key={`railing-x-${i}`} position={[x, 0.5, 0]}>
          <boxGeometry args={[0.2, 0.8, size[2]]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      ))}

      {[-size[2] / 2 + 0.3, size[2] / 2 - 0.3].map((z, i) => (
        <mesh key={`railing-z-${i}`} position={[0, 0.5, z]}>
          <boxGeometry args={[size[0], 0.8, 0.2]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      ))}
    </group>
  );
}

// Column component
function Column({ position, height = 4, color = "#8b4513" }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, height, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  );
}

// Window component
function Window({ position, size = [1, 1, 0.1], color = "#87CEEB" }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.7}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  );
}