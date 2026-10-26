import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Where the camera sits relative to the player (behind and above).
const CAMERA_OFFSET = new THREE.Vector3(0, 8, 10.5);

// Height on the player that the camera looks at.
const LOOK_AT_HEIGHT = 1.2;

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
export default function FollowCamera({ targetRef }) {
  const { camera } = useThree();
  const desiredPosition = useRef(new THREE.Vector3());
  const lookAtTarget = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const target = targetRef.current;
    if (!target) return;

    desiredPosition.current.set(
      target.position.x + CAMERA_OFFSET.x,
      target.position.y + CAMERA_OFFSET.y,
      target.position.z + CAMERA_OFFSET.z
    );

    camera.position.lerp(
      desiredPosition.current,
      1 - Math.exp(-FOLLOW_SPEED * delta)
    );

    lookAtTarget.current.set(
      target.position.x,
      target.position.y + LOOK_AT_HEIGHT,
      target.position.z
    );
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}
