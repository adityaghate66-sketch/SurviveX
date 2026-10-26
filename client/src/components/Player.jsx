import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OBSTACLES, PLAYER_SPAWN, ROOM_BOUNDS } from "../scenes/classroomLayout.js";
import { clampToRoom, resolveObstacle } from "../game/collision.js";

const MOVE_SPEED = 4; // units per second
const TURN_SPEED = 14; // how quickly the character turns to face a new direction
const PLAYER_RADIUS = 0.45; // used for collisions with desks and walls

// Keys the game reacts to. Used to stop the page from scrolling while playing.
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

export default function Player({ bodyRef }) {
  const internalRef = useRef(null);
  const playerRef = bodyRef ?? internalRef;
  const keys = useRef({});

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (MOVEMENT_CODES.has(event.code)) event.preventDefault();
      keys.current[event.code] = true;
    };

    const handleKeyUp = (event) => {
      keys.current[event.code] = false;
    };

    // Losing focus (e.g. switching tabs) must not leave keys stuck down.
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
    if (!player) return;
    const pressed = keys.current;

    // Note: the values in `pressed` are booleans or `undefined`, never 0/1.
    // `Number(undefined)` is NaN, and NaN would poison the whole axis, so each
    // key is normalised to 0 or 1 explicitly.
    const axis = (positive, negative) =>
      (positive ? 1 : 0) - (negative ? 1 : 0);

    const moveX = axis(pressed.KeyD || pressed.ArrowRight, pressed.KeyA || pressed.ArrowLeft);
    const moveZ = axis(pressed.KeyS || pressed.ArrowDown, pressed.KeyW || pressed.ArrowUp);

    movementVector.set(moveX, 0, moveZ);

    if (movementVector.lengthSq() > 0) {
      movementVector.normalize();

      // Cap delta so a long frame (tab refocus) cannot teleport the player.
      const step = Math.min(delta, 0.1);
      player.position.addScaledVector(movementVector, MOVE_SPEED * step);

      // Turn to face the direction of travel.
      const targetAngle = Math.atan2(-movementVector.x, -movementVector.z);
      let difference = targetAngle - player.rotation.y;
      difference = Math.atan2(Math.sin(difference), Math.cos(difference));
      player.rotation.y += difference * Math.min(1, TURN_SPEED * delta);
    }

    // Keep the player inside the room and out of the desks.
    clampToRoom(player.position, PLAYER_RADIUS, ROOM_BOUNDS);

    for (const obstacle of OBSTACLES) {
      resolveObstacle(player.position, PLAYER_RADIUS, obstacle);
    }

    clampToRoom(player.position, PLAYER_RADIUS, ROOM_BOUNDS);
  });

  return (
    <group ref={playerRef} position={PLAYER_SPAWN}>
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
