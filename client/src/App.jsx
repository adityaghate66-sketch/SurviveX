import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Classroom from "./scenes/Classroom.jsx";
import Player from "./components/Player.jsx";
import FollowCamera from "./components/FollowCamera.jsx";
import { PLAYER_SPAWN } from "./scenes/classroomLayout.js";
import "./App.css";

export default function App() {
  // Shared handle on the player's 3D group so the camera can follow it.
  const playerRef = useRef(null);

  return (
    <main className="game">
      <Canvas
        shadows
        camera={{
          // Starts behind the player; FollowCamera takes over on the first frame.
          position: [PLAYER_SPAWN[0], 8, PLAYER_SPAWN[2] + 10.5],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
      >
        <color attach="background" args={["#A9C9DC"]} />

        <Classroom />
        <Player bodyRef={playerRef} />
        <FollowCamera targetRef={playerRef} />
      </Canvas>

      <header className="game-header">
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <h1>SurviveX</h1>
            <p>PLAY. PREPARE. SURVIVE.</p>
          </div>
        </div>

        <div className="status">
          <span className="status-dot" />
          TRAINING MODE
        </div>
      </header>

      <section className="mission-card">
        <p className="eyebrow">MISSION 001</p>
        <h2>Know Your Surroundings</h2>
        <p>Explore the classroom before the emergency begins.</p>
        <div className="mission-progress">
          <span />
        </div>
        <small>OBJECTIVE: Explore the environment</small>
      </section>

      <footer className="controls-card">
        <span className="controls-title">MOVEMENT</span>
        <div className="key-row">
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>
        </div>
        <span className="controls-help">or arrow keys</span>
        <p>The camera follows your player</p>
      </footer>

      <div className="scene-label">
        <span className="scene-label-dot" />
        CLASSROOM · ZONE A
      </div>
    </main>
  );
}
