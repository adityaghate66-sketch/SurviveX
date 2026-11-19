// Coastal District 001 - main environment scene
// Phase 2: Roads and Town Layout
//
// Composition root for the coastal world. It only assembles components; all
// geography comes from terrain.js and all roads from roads.js.
//
// This scene is deliberately separate from Classroom.jsx. Phase 2 exposes it
// through the /coastal.html preview entry so the existing game (and its
// classroom) is untouched; player/multiplayer integration is Phase 6.

import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import TerrainMesh from "./TerrainMesh.jsx";
import Beach from "./Beach.jsx";
import River from "./River.jsx";
import Ocean from "./Ocean.jsx";
import Roads from "./Roads.jsx";
import ResidentialArea from "./ResidentialArea.jsx";
import Beachfront from "./Beachfront.jsx";
import { WALKABLE_BOUNDS } from "./coastalBounds.js";

const COASTAL_CAMERA = {
  position: [180, 210, -540],
  fov: 45,
  near: 0.5,
  far: 3000,
};

const SUN_POSITION = [220, 340, 160];

export default function CoastalDistrict({ showDebug = false, showBounds = false, debugCamera = false, debugStats = false }) {
  return (
    <Canvas
      shadows
      camera={COASTAL_CAMERA}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#a9cede"]} />
      <fog attach="fog" args={["#c2dbe6", 380, 1500]} />

      <Suspense fallback={null}>
        <hemisphereLight args={["#e2f2ff", "#5c6448", 0.75]} />
        <ambientLight intensity={0.25} />

        <directionalLight
          position={SUN_POSITION}
          intensity={2.1}
          color="#fff2dc"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-450}
          shadow-camera-right={450}
          shadow-camera-top={450}
          shadow-camera-bottom={-450}
          shadow-camera-near={1}
          shadow-camera-far={1200}
          shadow-bias={-0.0004}
        />

        <Ocean />
        <TerrainMesh showDebug={showDebug} />
        <Beach />
        <River />
        <Roads />
        <Beachfront />
        <ResidentialArea />

        {showBounds && <WalkableBounds />}
        {debugStats && <SceneStats />}
        {debugCamera && (
          <OrbitControls
            makeDefault
            target={[0, 10, 0]}
            maxPolarAngle={Math.PI / 2.05}
            minDistance={20}
            maxDistance={900}
            enableDamping
          />
        )}
      </Suspense>
    </Canvas>
  );
}

// Debug overlay for the playable map boundary.
function WalkableBounds() {
  const { geometry, center } = useMemo(() => {
    const width = WALKABLE_BOUNDS.maxX - WALKABLE_BOUNDS.minX;
    const depth = WALKABLE_BOUNDS.maxZ - WALKABLE_BOUNDS.minZ;
    const cx = (WALKABLE_BOUNDS.minX + WALKABLE_BOUNDS.maxX) / 2;
    const cz = (WALKABLE_BOUNDS.minZ + WALKABLE_BOUNDS.maxZ) / 2;

    const box = new THREE.BoxGeometry(width, 1, depth);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();

    return { geometry: edges, center: [cx, 2, cz] };
  }, []);

  return (
    <lineSegments geometry={geometry} position={center}>
      <lineBasicMaterial color="#22c55e" transparent opacity={0.7} />
    </lineSegments>
  );
}

// Dev-only scene statistics, exposed on window.__coastal so the headless render
// check can report draw calls and triangle counts (useful for Phase 8).
function SceneStats() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const timer = setInterval(() => {
      let meshes = 0;
      let triangles = 0;
      const materials = new Set();

      scene.traverse((object) => {
        if (!object.isMesh) return;
        meshes++;
        const geometry = object.geometry;
        const count = geometry.index ? geometry.index.count : geometry.attributes.position?.count ?? 0;
        triangles += count / 3;
        if (object.material) materials.add(object.material.uuid);
      });

      window.__coastal = {
        meshes,
        triangles: Math.round(triangles),
        uniqueMaterials: materials.size,
        drawCalls: gl.info.render.calls,
        renderedTriangles: gl.info.render.triangles,
        camera, // live reference, dev-only (lets the render check reframe)
      };
    }, 700);

    return () => clearInterval(timer);
  }, [gl, scene, camera]);

  return null;
}
