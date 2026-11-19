// Player controller for the coastal world.
//
// The classroom Player is tied to a flat floor, desks and emergency props.
// Outdoors the player instead follows the rendered terrain height, may cross
// the river on a bridge deck, and cannot walk into the sea, the harbour basin
// or the open river channel.
//
// Kept separate from Player.jsx so the classroom controller (and its survival
// mechanics) stay untouched.

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getMeshHeight } from "../scenes/CoastalDistrict/terrain.js";
import { isWalkable } from "../scenes/CoastalDistrict/coastalBounds.js";
import {
  getBridgeDeckHeight,
  isOnBridgeDeck,
} from "../scenes/CoastalDistrict/roads.js";
import { COASTAL_SPAWN } from "../game/coastalMission.js";

const MOVE_SPEED = 7; // metres per second (the district is 800m across)
const TURN_SPEED = 12; // how quickly the character faces a new direction

const MOVEMENT_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

const movementVector = new THREE.Vector3();

// Ground height under the player: bridge deck when on a bridge, otherwise the
// rendered terrain surface. Never the analytic height, so nothing floats.
function groundHeightAt(x, z) {
  const deck = getBridgeDeckHeight(x, z);
  return deck ?? getMeshHeight(x, z);
}

// A position is standable when it is on land, or on a bridge deck over water.
function canStandAt(x, z) {
  return isWalkable(x, z) || isOnBridgeDeck(x, z);
}

export default function CoastalPlayer({ bodyRef, active = true, onPositionUpdate }) {
  const internalRef = useRef(null);
  const playerRef = bodyRef ?? internalRef;
  const keys = useRef({});
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    if (!active) keys.current = {};
  }, [active]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (MOVEMENT_CODES.has(event.code)) event.preventDefault();
      keys.current[event.code] = true;
    };

    const handleKeyUp = (event) => {
      keys.current[event.code] = false;
    };

    const handleBlur = () => {
      keys.current = {};
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useFrame((_, delta) => {
    const player = playerRef.current;
    if (!player || !activeRef.current) return;

    const pressed = keys.current;

    const axis = (positive, negative) => (positive ? 1 : 0) - (negative ? 1 : 0);
    const moveX = axis(pressed.KeyD || pressed.ArrowRight, pressed.KeyA || pressed.ArrowLeft);
    const moveZ = axis(pressed.KeyS || pressed.ArrowDown, pressed.KeyW || pressed.ArrowUp);

    movementVector.set(moveX, 0, moveZ);

    if (movementVector.lengthSq() > 0) {
      movementVector.normalize();

      // Cap delta so a long frame (tab refocus) cannot teleport the player.
      const step = Math.min(delta, 0.1) * MOVE_SPEED;
      const nextX = player.position.x + movementVector.x * step;
      const nextZ = player.position.z + movementVector.z * step;

      // Move if the whole step is standable; otherwise slide along whichever
      // axis is still valid so the shoreline does not feel like glue.
      if (canStandAt(nextX, nextZ)) {
        player.position.x = nextX;
        player.position.z = nextZ;
      } else {
        if (canStandAt(nextX, player.position.z)) player.position.x = nextX;
        if (canStandAt(player.position.x, nextZ)) player.position.z = nextZ;
      }

      const targetAngle = Math.atan2(-movementVector.x, -movementVector.z);
      let difference = targetAngle - player.rotation.y;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      player.rotation.y += difference * Math.min(1, TURN_SPEED * delta);
    }

    // Follow the visible ground: terrain, or the bridge deck over the river.
    player.position.y = groundHeightAt(player.position.x, player.position.z);

    if (onPositionUpdate) {
      onPositionUpdate({
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        rotY: player.rotation.y,
      });
    }
  });

  return (
    <group
      ref={playerRef}
      position={[COASTAL_SPAWN.x, groundHeightAt(COASTAL_SPAWN.x, COASTAL_SPAWN.z), COASTAL_SPAWN.z]}
    >
      {/* Body */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.38, 0.8, 4, 8]} />
        <meshStandardMaterial color="#2563EB" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshStandardMaterial color="#E7B58A" />
      </mesh>

      {/* Direction marker (the player's "front" is -z) */}
      <mesh position={[0, 1.1, -0.42]}>
        <boxGeometry args={[0.18, 0.16, 0.12]} />
        <meshStandardMaterial color="#FDE047" />
      </mesh>
    </group>
  );
}
