import { DESKS, ROOM, TEACHER_DESK, EMERGENCY_PROPS } from "./classroomLayout.js";

// Tabletop sits at y = 1.05 with 0.14 thickness, so the legs run from the floor
// (0) up to 0.98 — flush under the tabletop instead of poking through it.
const TABLETOP_Y = 1.05;
const TABLETOP_THICKNESS = 0.14;
const LEG_HEIGHT = TABLETOP_Y - TABLETOP_THICKNESS / 2;
const LEG_Y = LEG_HEIGHT / 2;

function Desk({ position }) {
  return (
    <group position={position}>
      {/* Tabletop */}
      <mesh position={[0, TABLETOP_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, TABLETOP_THICKNESS, 0.9]} />
        <meshStandardMaterial color="#B98250" roughness={0.75} />
      </mesh>

      {/* Four legs */}
      {[-0.72, 0.72].map((x) =>
        [-0.32, 0.32].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, LEG_Y, z]}
            castShadow
          >
            <boxGeometry args={[0.09, LEG_HEIGHT, 0.09]} />
            <meshStandardMaterial color="#505B68" />
          </mesh>
        ))
      )}

      {/* Chair seat */}
      <mesh position={[0, 0.55, 0.95]} castShadow receiveShadow>
        <boxGeometry args={[0.75, 0.12, 0.7]} />
        <meshStandardMaterial color="#3977A8" />
      </mesh>

      {/* Chair backrest */}
      <mesh position={[0, 1, 1.25]} castShadow>
        <boxGeometry args={[0.75, 0.85, 0.12]} />
        <meshStandardMaterial color="#3977A8" />
      </mesh>

      {/* Chair legs */}
      {[-0.28, 0.28].map((x) =>
        [0.7, 1.2].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, 0.27, z]}
            castShadow
          >
            <boxGeometry args={[0.07, 0.5, 0.07]} />
            <meshStandardMaterial color="#505B68" />
          </mesh>
        ))
      )}
    </group>
  );
}

function Window({ position }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.12, 2.3, 2.8]} />
        <meshStandardMaterial
          color="#76C8E8"
          emissive="#235D78"
          emissiveIntensity={0.25}
        />
      </mesh>

      <mesh position={[0.08, 0, 0]}>
        <boxGeometry args={[0.1, 2.5, 0.12]} />
        <meshStandardMaterial color="#F1F5F9" />
      </mesh>

      <mesh position={[0.08, 0, 0]}>
        <boxGeometry args={[0.1, 0.12, 2.9]} />
        <meshStandardMaterial color="#F1F5F9" />
      </mesh>
    </group>
  );
}

export default function Classroom({ activeProp = null } = {}) {
  const halfWidth = ROOM.width / 2;
  const halfDepth = ROOM.depth / 2;

  return (
    <>
      {/* Lighting: soft fill plus one shadow-casting "sun" through the windows. */}
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#DCEEFF", "#B7AE9C", 0.45]} />
      <directionalLight
        position={[-6, 12, 6]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#D9D4C7" roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, ROOM.height / 2, -halfDepth]} receiveShadow>
        <boxGeometry args={[ROOM.width, ROOM.height, 0.25]} />
        <meshStandardMaterial color="#E8E5DE" />
      </mesh>

      {/* Left wall */}
      <mesh position={[-halfWidth, ROOM.height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.25, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color="#D4E0E5" />
      </mesh>

      {/* Right wall */}
      <mesh position={[halfWidth, ROOM.height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.25, ROOM.height, ROOM.depth]} />
        <meshStandardMaterial color="#D4E0E5" />
      </mesh>

      {/* Whiteboard */}
      <mesh position={[0, 3.2, -halfDepth + 0.18]}>
        <boxGeometry args={[6, 1.8, 0.08]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.25} />
      </mesh>

      {/* Teacher's desk */}
      <mesh
        position={TEACHER_DESK.position}
        castShadow
        receiveShadow
      >
        <boxGeometry args={TEACHER_DESK.size} />
        <meshStandardMaterial color="#76503A" />
      </mesh>

      {/* Windows on the left wall */}
      <Window position={[-halfWidth + 0.18, 3.5, -4.5]} />
      <Window position={[-halfWidth + 0.18, 3.5, 0]} />
      <Window position={[-halfWidth + 0.18, 3.5, 4.5]} />

      {/* Emergency Props (e.g. Fire Extinguishers) */}
      {EMERGENCY_PROPS.map((prop) => {
        const isActive = prop.id === activeProp?.id;
        return (
          <group key={prop.id} position={prop.position}>
            <mesh castShadow emissive={isActive ? "#4ade80" : "#000000"} emissiveIntensity={isActive ? 0.3 : 0}>
              <cylinderGeometry args={[isActive ? 0.22 : 0.2, isActive ? 0.22 : 0.2, isActive ? 0.95 : 0.9, 16]} />
              <meshStandardMaterial color={isActive ? "#22c55e" : "#dc2626"} roughness={isActive ? 0.2 : 0.3} />
            </mesh>
            <mesh position={[0, isActive ? 0.55 : 0.5, 0]}>
              <cylinderGeometry args={[isActive ? 0.1 : 0.1, isActive ? 0.22 : 0.2, isActive ? 0.25 : 0.2, 16]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {isActive && (
              <mesh position={[0.6, 0, 0]}>
                <planeGeometry args={[1.2, 0.25]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Hallway Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, halfDepth + ROOM.hallwayDepth / 2]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.width, ROOM.hallwayDepth]} />
        <meshStandardMaterial color="#D9D4C7" roughness={0.9} />
      </mesh>

      {/* Hallway Left wall */}
      <mesh position={[-halfWidth, ROOM.height / 2, halfDepth + ROOM.hallwayDepth / 2]} receiveShadow>
        <boxGeometry args={[0.25, ROOM.height, ROOM.hallwayDepth]} />
        <meshStandardMaterial color="#D4E0E5" />
      </mesh>

      {/* Hallway Right wall */}
      <mesh position={[halfWidth, ROOM.height / 2, halfDepth + ROOM.hallwayDepth / 2]} receiveShadow>
        <boxGeometry args={[0.25, ROOM.height, ROOM.hallwayDepth]} />
        <meshStandardMaterial color="#D4E0E5" />
      </mesh>
    </>
  );
}
