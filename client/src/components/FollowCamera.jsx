import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Default (classroom) framing.
const DEFAULT_OFFSET = new THREE.Vector3(0, 8, 10.5);
const DEFAULT_LOOK_AT_HEIGHT = 1.2;

// Higher = camera catches up faster. 6 keeps it smooth but responsive.
const FOLLOW_SPEED = 6;

/**
 * Third-person follow camera.
 *
 * Each frame it works out where the camera *should* be based on the player's
 * position, then eases towards that spot instead of snapping to it. The easing
 * uses `1 - Math.exp(-speed * delta)` so the motion feels the same at 60fps and
 * 144fps.
 */
export default function FollowCamera({
  targetRef,
  disasterState = "none",
  offset,
  lookAtHeight,
}) {
  const { camera } = useThree();
  const desiredPosition = useRef(new THREE.Vector3());
  const lookAtTarget = useRef(new THREE.Vector3());

  const camOffset = offset
    ? new THREE.Vector3(offset[0], offset[1], offset[2])
    : DEFAULT_OFFSET;
  const camLookAtHeight =
    typeof lookAtHeight === "number" ? lookAtHeight : DEFAULT_LOOK_AT_HEIGHT;

  useFrame((state, delta) => {
    const target = targetRef.current;
    if (!target) return;

    desiredPosition.current.set(
      target.position.x + camOffset.x,
      target.position.y + camOffset.y,
      target.position.z + camOffset.z
    );

    camera.position.lerp(
      desiredPosition.current,
      1 - Math.exp(-FOLLOW_SPEED * delta)
    );

    // Apply camera shake if earthquake is active
    if (disasterState === "earthquake") {
      const shakeIntensity = 0.25;
      camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      camera.position.y += (Math.random() - 0.5) * shakeIntensity;
      camera.position.z += (Math.random() - 0.5) * shakeIntensity;
    }

    lookAtTarget.current.set(
      target.position.x,
      target.position.y + camLookAtHeight,
      target.position.z
    );
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}
