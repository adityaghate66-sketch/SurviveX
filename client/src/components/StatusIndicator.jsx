import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Status indicator that pulses based on state (safe, warning, danger)
export default function StatusIndicator({
  status = "safe",
  size = 0.3,
  position = [0, 2, 0]
}) {
  const meshRef = useRef();
  const materialRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const elapsed = clock.getElapsedTime();

    // Pulse animation
    const pulse = 1 + 0.1 * Math.sin(elapsed * 3);
    meshRef.current.scale.setScalar(size * pulse);

    // Color based on status
    const colors = {
      safe: "#22c55e",
      warning: "#f59e0b",
      danger: "#ef4444",
      neutral: "#64748b"
    };

    if (materialRef.current) {
      materialRef.current.color.set(colors[status] || colors.neutral);

      // Additional animation for danger
      if (status === "danger") {
        materialRef.current.emissive.set(colors.danger);
        materialRef.current.emissiveIntensity = 0.3 + 0.2 * Math.sin(elapsed * 5);
      } else {
        materialRef.current.emissive.set("#000000");
        materialRef.current.emissiveIntensity = 0;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        ref={materialRef}
        transparent
        opacity={0.9}
        emissive={status === "danger" ? "#ef4444" : "#000000"}
        emissiveIntensity={0}
      />
    </mesh>
  );
}