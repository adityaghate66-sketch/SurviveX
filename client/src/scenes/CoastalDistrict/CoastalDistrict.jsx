// Coastal District 001 - Main Scene Component
// Phase 1: Terrain and Geography
//
// This is the main scene file for the Coastal District environment.
// It renders the geographical foundation: ocean, coastline, beach, river, and hills.

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Stars } from "@react-three/drei";
import TerrainMesh from "./TerrainMesh.jsx";
import Beach from "./Beach.jsx";
import River from "./River.jsx";
import Hills from "./Hills.jsx";
import Ocean from "./Ocean.jsx";

// Default camera position for the coastal scene
// Positioned to show the full scope of the environment
const COASTAL_CAMERA_INITIAL = {
  position: [0, 50, 400],  // High above, looking down at the coast
  fov: 45,
  near: 0.1,
  far: 5000,
};

export default function CoastalDistrict({ showDebug = false }) {
  return (
    <Canvas
      shadows
      camera={COASTAL_CAMERA_INITIAL}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        {/* Ambient lighting for the entire scene */}
        <ambientLight intensity={0.4} />

        {/* Directional "sun" light - simulates late afternoon sun */}
        <directionalLight
          position={[100, 200, 100]}
          intensity={1.2}
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

        {/* Sky environment */}
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

        {/* Environment map for reflections */}
        <Environment
          preset="sunset"
          background={false}
          ground={false}
        />

        {/* Starry sky for nighttime look */}
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