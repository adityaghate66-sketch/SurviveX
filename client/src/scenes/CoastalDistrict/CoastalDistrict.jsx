// Coastal District 001 - standalone preview wrapper (dev /coastal.html)
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import CoastalWorld, { SceneStats } from "./CoastalWorld.jsx";

const COASTAL_CAMERA = {
  position: [180, 210, -540],
  fov: 45,
  near: 0.5,
  far: 3000,
};

export default function CoastalDistrict({
  showDebug = false,
  showBounds = false,
  debugCamera = false,
  debugStats = false,
}) {
  return (
    <Canvas
      shadows
      camera={COASTAL_CAMERA}
      gl={{ antialias: true }}
      dpr={[1, 2]}
    >
      <CoastalWorld
        showDebug={showDebug}
        showBounds={showBounds}
        debugStats={debugStats}
      />
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
    </Canvas>
  );
}
