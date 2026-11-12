import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clampToRoom, resolveObstacle } from "../game/collision.js";
import { ROOM_BOUNDS, EXPLORATION_ZONES, OBSTACLES, PLAYER_SPAWN } from "../scenes/classroomLayout.js";
import { updateSessionProgress, getSessionProgress } from "../services/api.js";

const MOVE_SPEED = 4; // units per second
const TURN_SPEED = 14; // how quickly the character turns to face a new direction
const PLAYER_RADIUS = 0.45; // used for collisions with desks and walls
const ZONE_DETECTION_DEBOUNCE_MS = 1000; // avoid submitting the same zone repeatedly

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
export default function Player({ bodyRef, active = true, sessionId }) {
  const internalRef = useRef(null);
  const playerRef = bodyRef ?? internalRef;
  const keys = useRef({});
  const activeRef = useRef(active);

  // Zone detection state
  const [lastZoneSubmitted, setLastZoneSubmitted] = useState(null);
  const [zoneNotification, setZoneNotification] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const zoneLastSeen = useRef(new Map()); // tracks last frame zone was detected

  useEffect(() => {
    activeRef.current = active;
    if (!active) keys.current = {}; // drop keys held when play paused
  }, [active]);

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

    // Keep the player inside the room and out of the desks.
    clampToRoom(player.position, PLAYER_RADIUS, ROOM_BOUNDS);

    for (const obstacle of OBSTACLES) {
      resolveObstacle(player.position, PLAYER_RADIUS, obstacle);
    }

    clampToRoom(player.position, PLAYER_RADIUS, ROOM_BOUNDS);

    // Zone entry detection
    const playerPos = player.position;
    const now = Date.now();

    for (const zone of EXPLORATION_ZONES) {
      const dx = playerPos.x - zone.center[0];
      const dy = playerPos.y - zone.center[1];
      const dz = playerPos.z - zone.center[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Player is within zone radius
      if (distance < zone.radius) {
        // Check if we haven't already submitted this zone or if enough time has passed
        const lastSeen = zoneLastSeen.current.get(zone.id) || 0;
        if (now - lastSeen > ZONE_DETECTION_DEBOUNCE_MS) {
          zoneLastSeen.current.set(zone.id, now);

          // Only notify and submit if this is a newly discovered zone
          if (lastZoneSubmitted !== zone.id) {
            setLastZoneSubmitted(zone.id);
            setZoneNotification({
              zoneId: zone.id,
              zoneLabel: zone.label,
            });

            // Submit zone discovery to backend
            if (sessionId) {
              ;(async () => {
                try {
                  const progressResponse = await updateSessionProgress(sessionId, zone.id);
                  if (progressResponse.ok && progressResponse.data?.newlyDiscovered) {
                    // Progress updated successfully on server
                    // The UI will be refreshed via the progress getter
                    setZoneNotification(prev => prev && prev.zoneId !== zone.id ? null : { zoneId: zone.id, zoneLabel: zone.label, newlyDiscovered: true });
                  }
                } catch (err) {
                  console.error("Failed to update zone progress:", err);
                }
              })();
            }
          }
        }
      }
    }
  });

  // Fetch progress from backend on mount and when session changes
  useEffect(() => {
    if (!sessionId) return;

    ;(async () => {
      try {
        const progressResponse = await getSessionProgress(sessionId);
        if (progressResponse.ok) {
          setProgressData(progressResponse.data);
        }
      } catch (err) {
        console.error("Failed to fetch session progress:", err);
      }
    })();
  }, [sessionId]);

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
