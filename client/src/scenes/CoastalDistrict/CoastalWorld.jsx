// Coastal District 001 - world contents (no Canvas).
// Extracted from CoastalDistrict.jsx so App can compose the coastal world
// inside the shared game Canvas for Mission 002.

import { Suspense, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import TerrainMesh from "./TerrainMesh.jsx";
import Beach from "./Beach.jsx";
import River from "./River.jsx";
import Ocean from "./Ocean.jsx";
import Roads from "./Roads.jsx";
import ResidentialArea from "./ResidentialArea.jsx";
import Beachfront from "./Beachfront.jsx";
import { WALKABLE_BOUNDS } from "./coastalBounds.js";

const SUN_POSITION = [220, 340, 160];

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
export function SceneStats() {
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
        const count = geometry.index
          ? geometry.index.count
          : geometry.attributes.position?.count ?? 0;
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

export default function CoastalWorld({
  showDebug = false,
  showBounds = false,
  debugStats = false,
}) {
  return (
    <>
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
      </Suspense>
    </>
  );
}