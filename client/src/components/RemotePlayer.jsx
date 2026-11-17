import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function RemotePlayer({ id, name, position, rotY }) {
  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current || !position) return;

    // Interpolate towards the server position for smooth movement
    const lerpFactor = 0.15;
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      position.x,
      lerpFactor
    );
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      position.z,
      lerpFactor
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      rotY || 0,
      lerpFactor
    );
  });

  return (
    <group
      ref={groupRef}
      position={[position?.x || 0, 0, position?.z || 0]}
      rotation={[0, rotY || 0, 0]}
      name={name || `player-${id}`}
    >
      {/* Body - green color for remote players */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.38, 0.8, 4, 8]} />
        <meshStandardMaterial color="#34d399" />
      </mesh>

      {/* Head - yellow for remote players (different from local player) */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color="#FBBF24" />
      </mesh>

      {/* Direction marker */}
      <mesh position={[0, 1.1, -0.42]}>
        <boxGeometry args={[0.18, 0.16, 0.12]} />
        <meshStandardMaterial color="#FDE047" />
      </mesh>
    </group>
  );
}