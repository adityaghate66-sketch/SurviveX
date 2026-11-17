// Coastal District 001 - Main Scene Component
// Phase 2: Roads and Town Layout
// Updated to include roads and town layout
//
// This is the main scene file for the Coastal District environment.
// It renders the geographical foundation plus roads and town layout.

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Stars } from "@react-three/drei";
import TerrainMesh from "./TerrainMesh.jsx";
import Beach from "./Beach.jsx";
import River from "./River.jsx";
import Hills from "./Hills.jsx";
import Ocean from "./Ocean.jsx";
import Roads from "./Roads.jsx";
import ResidentialArea from "./ResidentialArea.jsx";
import Beachfront from "./Beachfront.jsx";
import { WALKABLE_BOUNDS, isWalkable } from "./coastalBounds.js";

// Camera position optimized for the full 800m x 800m world
const COASTAL_CAMERA_INITIAL = {
  position: [0, 150, 450],  // Higher to see the full world
  fov: 40,
  near: 0.1,
  far: 5000,
};

export default function CoastalDistrict({ showDebug = false, showBounds = false }) {
  return (
    <Canvas
      shadows
      camera={COASTAL_CAMERA_INITIAL}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        {/* Ambient lighting for the entire scene */}
        <ambientLight intensity={0.5} />

        {/* Directional "sun" light - simulates late afternoon sun */}
        <directionalLight
          position={[150, 250, 100]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-500}
          shadow-camera-right={500}
          shadow-camera-top={500}
          shadow-camera-bottom={-500}
          shadow-camera-near={1}
          shadow-camera-far={1000}
        />

        {/* Sky color */}
        <color attach="background" args={["#87CEEB"]} />

        {/* Ocean - surrounds the entire coastal area */}
        <Ocean />

        {/* Terrain base mesh */}
        <TerrainMesh showDebug={showDebug} />

        {/* Beach along the coastline */}
        <Beach />

        {/* River flowing from hills to ocean */}
        <River />

        {/* Elevated green hills in northwest */}
        <Hills />

        {/* Road network */}
        <Roads />

        {/* Beachfront hotels and harbour */}
        <Beachfront />

        {/* Residential neighborhood */}
        <ResidentialArea />

        {/* Environment map for reflections */}
        <Environment
          preset="sunset"
          background={false}
          ground={false}
        />

        {/* Debug: show walkable bounds */}
        {showBounds && (
          <WalkableBounds />
        )}

        {/* Starry sky for atmosphere */}
        <Stars
          radius={1000}
          depth={50}
          count={5000}
          minsize={0.2}
          maxsize={1.5}
        />
      </Suspense>
    </Canvas>
  );
}

// Debug component to show walkable bounds
function WalkableBounds() {
  return (
    <group>
      {/* Walkable area boundary */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[50, 55, 64]} />
        <meshBasicMaterial
          color="#00ff00"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Import THREE for the debug component
import * as THREE from "three";