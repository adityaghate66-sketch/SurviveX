import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clampToRoom, resolveObstacle } from "../game/collision.js";
import { WALKABLE_BOUNDS, isWalkable, getWalkableHeight } from "../scenes/CoastalDistrict/coastalBounds.js";

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

// `active` is false until the backend has confirmed a session, so the player
// stands still (and cannot trigger discoveries) before the mission starts.
// `activeProp`/`setActiveProp` are owned by App so the HUD and the 3D scene
// agree on which emergency item the player is carrying. Zone discovery is
// handled once, by ZoneDetector in App.
export default function Player({ bodyRef, active = true, activeProp, setActiveProp, onPositionUpdate }) {
  const internalRef = useRef(null);
  const playerRef = bodyRef ?? internalRef;
  const keys = useRef({});
  const activeRef = useRef(active);

  // Survival state
  const [isCovered, setIsCovered] = useState(false);
  const [internalActiveProp, setInternalActiveProp] = useState(null);
  const currentProp = activeProp ?? internalActiveProp;
  const updateActiveProp = setActiveProp ?? setInternalActiveProp;

  useEffect(() => {
    activeRef.current = active;
    if (!active) keys.current = {}; // drop keys held when play paused
  }, [active]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (MOVEMENT_CODES.has(event.code) || event.code === "KeyC") event.preventDefault();
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
    if (!player || !activeRef.current) return;
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

    // Keep the player inside walkable bounds and out of deep water / harbour / river.
    clampToRoom(player.position, PLAYER_RADIUS, WALKABLE_BOUNDS);

    for (const obstacle of OBSTACLES) {
      resolveObstacle(player.position, PLAYER_RADIUS, obstacle);
    }

    clampToRoom(player.position, PLAYER_RADIUS, WALKABLE_BOUNDS);

    // Keep player on walkable terrain (not deep water, not harbour, not river).
    const onWalkable = isWalkable(player.position.x, player.position.z);

    // Take cover logic only works on land (not water).
    let nearDesk = false;
    for (const desk of DESKS) {
      const dx = player.position.x - desk.position[0];
      const dz = player.position.z - desk.position[2];
      if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
        nearDesk = true;
        break;
      }
    }
    const canTakeCover = onWalkable && pressed.KeyC && nearDesk;
    if (canTakeCover !== isCovered) setIsCovered(canTakeCover);

    // Emergency prop interaction (Press F to use)
    let currentActiveProp = null;
    for (const prop of EMERGENCY_PROPS) {
      const dx = player.position.x - prop.position[0];
      const dz = player.position.z - prop.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 1.8) {
        currentActiveProp = prop;
        if (pressed.KeyF) {
          updateActiveProp(prop);
          console.log(`Picked up: ${prop.label}`);
        }
        break;
      }
    }
    if (!currentActiveProp && currentProp) updateActiveProp(null);

    // Align player y-height with terrain.
    player.position.y = getWalkableHeight(player.position.x, player.position.z);

    // Share the player's transform with the multiplayer room.
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
    <group ref={playerRef} position={PLAYER_SPAWN} scale={isCovered ? [1, 0.6, 1] : [1, 1, 1]}>
      {/* Body */}
      <mesh position={[0, isCovered ? 0.6 : 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.38, 0.8, 4, 8]} />
        <meshStandardMaterial color={isCovered ? "#16a34a" : "#2563EB"} />
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
