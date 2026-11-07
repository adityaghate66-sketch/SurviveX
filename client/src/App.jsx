import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Classroom from "./scenes/Classroom.jsx";
import Player from "./components/Player.jsx";
import FollowCamera from "./components/FollowCamera.jsx";
import { PLAYER_SPAWN } from "./scenes/classroomLayout.js";
import { getHealth, getMissions } from "./services/api.js";
import "./App.css";

const DEFAULT_MISSION = {
  code: "001",
  title: "Know Your Surroundings",
  description: "Explore the classroom before the emergency begins.",
  objective: "Explore the environment",
  mode: "TRAINING",
};

export default function App() {
  // Shared handle on the player's 3D group so the camera can follow it.
  const playerRef = useRef(null);
  const [backendStatus, setBackendStatus] = useState({ loading: true });
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [missionSource, setMissionSource] = useState("local");

  useEffect(() => {
    let mounted = true;
    Promise.all([getHealth(), getMissions()])
      .then(([healthRes, missionsRes]) => {
        if (!mounted) return;

        if (healthRes.data?.data || healthRes.data?.error) {
          const payload = healthRes.data?.data ?? healthRes.data?.error?.details ?? {};
          const dbStatus = payload.database?.status;
          const healthy = healthRes.ok && healthRes.data?.success;
          setBackendStatus({
            loading: false,
            connected: true,
            dbStatus,
            message: healthy
              ? "API connected"
              : healthRes.data?.error?.message || payload.status || "API degraded",
          });
        } else {
          setBackendStatus({ loading: false, connected: false, message: "API unreachable" });
        }

        if (missionsRes.ok && missionsRes.data?.success && Array.isArray(missionsRes.data.data) && missionsRes.data.data.length > 0) {
          setMission(missionsRes.data.data[0]);
          setMissionSource("backend");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setBackendStatus({ loading: false, connected: false, message: err.message });
      });
    return () => {
      mounted = false;
    };
  }, []);

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

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="status">
            <span className="status-dot" />
            {(mission.mode || "TRAINING").toUpperCase()} MODE
          </div>
          <div
            className="status"
            title={backendStatus.message || ''}
            style={{
              opacity: backendStatus.loading ? 0.7 : 1,
              borderColor: backendStatus.loading
                ? '#999'
                : !backendStatus.connected
                  ? '#ef4444'
                  : backendStatus.dbStatus === 'connected'
                    ? '#22c55e'
                    : '#f59e0b',
            }}
          >
            <span
              className="status-dot"
              style={{
                background: backendStatus.loading
                  ? '#999'
                  : !backendStatus.connected
                    ? '#ef4444'
                    : backendStatus.dbStatus === 'connected'
                      ? '#22c55e'
                      : '#f59e0b',
                boxShadow: 'none',
              }}
            />
            {backendStatus.loading
              ? 'CONNECTING...'
              : !backendStatus.connected
                ? 'BACKEND OFFLINE'
                : backendStatus.dbStatus === 'connected'
                  ? 'BACKEND'
                  : 'API (DB OFF)'}
          </div>
        </div>
      </header>

      <section className="mission-card" title={missionSource === "backend" ? "Loaded from backend" : "Using local fallback"}>
        <p className="eyebrow">MISSION {mission.code || "001"}</p>
        <h2>{mission.title}</h2>
        <p>{mission.description}</p>
        <div className="mission-progress">
          <span style={{ width: `${Math.max(0, Math.min(100, Number(mission.progress) || 0)) || 15}%` }} />
        </div>
        <small>OBJECTIVE: {(mission.objective || "").toUpperCase() || "EXPLORE THE ENVIRONMENT"}</small>
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
