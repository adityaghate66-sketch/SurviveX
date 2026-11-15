import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 3D progress bar component
export default function ProgressBar({
  progress = 0,
  max = 100,
  position = [0, 2, 0],
  color = "#3b82f6",
  size = { width: 2, height: 0.3 }
}) {
  const barRef = useRef();
  const backgroundRef = useRef();
  const borderRef = useRef();

  useFrame(({ clock }) => {
    // Subtle glow on active progress
    if (barRef.current) {
      const elapsed = clock.getElapsedTime();
      const glow = 0.1 + 0.05 * Math.sin(elapsed * 3);
      if (progress > 0) {
        barRef.current.material.emissive.set(color);
        barRef.current.material.emissiveIntensity = glow;
      } else {
        barRef.current.material.emissive.set("#000000");
        barRef.current.material.emissiveIntensity = 0;
      }
    }
  });

  const clampedProgress = Math.max(0, Math.min(100, (progress / max) * 100));
  const fillWidth = (clampedProgress / 100) * size.width;

  return (
    <group position={position}>
      {/* Background */}
      <mesh ref={backgroundRef}>
        <boxGeometry args={[size.width, size.height, 0.05]} />
        <meshStandardMaterial
          color="#1e293b"
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Progress fill */}
      <mesh ref={barRef} position={[-(size.width - fillWidth) / 2, 0, 0.06]}>
        <boxGeometry args={[fillWidth, size.height - 0.04, 0.06]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.9}
          emissive={color}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Border highlight */}
      <mesh position={[0, 0, -0.01]}>
        <ringGeometry args={[size.width / 2 + 0.03, size.width / 2 + 0.04, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}