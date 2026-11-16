import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Contextual action prompt that appears near interactive objects
export default function ActionPrompt({
  visible = false,
  text = "",
  position = [0, 2, 0],
  color = "#ffffff"
}) {
  const meshRef = useRef();
  const materialRef = useRef();

  // `position` may be a THREE.Vector3 (from hazards) or a plain [x, y, z] tuple.
  const baseY = Array.isArray(position) ? position[1] : (position?.y ?? 0);

  useFrame(({ clock }) => {
    // Gentle floating animation
    if (meshRef.current) {
      meshRef.current.position.y = baseY + Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
    }
    if (materialRef.current) {
      materialRef.current.opacity = visible ? 0.9 : 0;
    }
  });

  if (!visible) return null;

  return (
    <group position={position} name={text || undefined}>
      {/* Background panel */}
      <mesh>
        <planeGeometry args={[2.8, 0.6]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#1e293b"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border highlight */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[1.4, 1.5, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Text placeholder (would use troika3d text or canvas texture in production) */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[2.6, 0.4]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={visible ? 1 : 0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}