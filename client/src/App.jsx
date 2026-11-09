import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Classroom from "./scenes/Classroom.jsx";
import Player from "./components/Player.jsx";
import FollowCamera from "./components/FollowCamera.jsx";
import ZoneDetector from "./components/ZoneDetector.jsx";
import { PLAYER_SPAWN } from "./scenes/classroomLayout.js";
import {
  getMissionSummary,
  mergeVisitedZones,
} from "./game/missionProgress.js";
import {
  completeSession,
  createSession,
  getHealth,
  getMissions,
  updateSessionProgress,
} from "./services/api.js";
import "./App.css";

const DEFAULT_MISSION = {
  code: "001",
  title: "Know Your Surroundings",
  description: "Explore the classroom before the emergency begins.",
  objective: "Explore the environment",
  mode: "TRAINING",
};

const PLAYER_NAME_KEY = "survivex.playerName";
const PENDING_RETRY_MS = 8000;

// A stable, non-secret display name per browser. The backend uses it to find
// the player's existing active session instead of creating a new one on every
// reload. If localStorage is unavailable we still play, just as "guest".
function getPlayerName() {
  try {
    const stored = window.localStorage.getItem(PLAYER_NAME_KEY);
    if (stored) return stored;

    const generated = `player-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(PLAYER_NAME_KEY, generated);
    return generated;
  } catch {
    return "guest";
  }
}

export default function App() {
  // Shared handle on the player's 3D group so the camera can follow it.
  const playerRef = useRef(null);

  // The single source of truth for mission progress. The percentage shown in
  // the UI is derived from this list, never stored separately.
  const [visitedZones, setVisitedZones] = useState([]);
  const [notification, setNotification] = useState(null);

  const [backendStatus, setBackendStatus] = useState({ loading: true });
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [missionSource, setMissionSource] = useState("local");

  // Persistence plumbing. Refs keep async callbacks from depending on state
  // that may change while a request is in flight.
  const sessionIdRef = useRef(null);
  const sessionKeyRef = useRef(null);
  const startingRef = useRef(false);
  const pendingZonesRef = useRef(new Set());
  const flushingRef = useRef(false);

  const summary = useMemo(() => getMissionSummary(visitedZones), [visitedZones]);

  // Dismiss the zone toast after a few seconds.
  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => setNotification(null), 3600);
    return () => clearTimeout(timer);
  }, [notification]);

  // Merge server state into local state. The server can only ever add zones
  // the player already found, so the local list stays a superset while offline.
  const applyServerProgress = useCallback((data) => {
    if (!data) return;
    setVisitedZones((current) => mergeVisitedZones(current, data.visitedZones));
  }, []);

  const markMissionComplete = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    await completeSession(sessionId);
  }, []);

  const persistZone = useCallback(
    async (zoneId) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        pendingZonesRef.current.add(zoneId);
        return;
      }

      const res = await updateSessionProgress(sessionId, zoneId);
      if (!res.ok) {
        // Backend temporarily unavailable: remember the zone and retry later.
        pendingZonesRef.current.add(zoneId);
        return;
      }

      const data = res.data?.data;
      applyServerProgress(data);
      if (data?.completed) await markMissionComplete();
    },
    [applyServerProgress, markMissionComplete]
  );

  // Send any discoveries that failed while the backend was offline.
  const flushPendingZones = useCallback(async () => {
    if (!sessionIdRef.current || pendingZonesRef.current.size === 0) return;
    if (flushingRef.current) return;

    flushingRef.current = true;
    try {
      const zones = [...pendingZonesRef.current];
      pendingZonesRef.current.clear();
      for (const zoneId of zones) {
        await persistZone(zoneId);
      }
    } finally {
      flushingRef.current = false;
    }
  }, [persistZone]);

  // Start (or resume) a session when the mission begins. POST /api/sessions
  // returns the existing ACTIVE session and its saved progress when there is
  // one, which is what restores progress after a page reload. Guarded so
  // StrictMode's double mount and retries cannot fire duplicate requests.
  const startSession = useCallback(async () => {
    const missionCode = mission.code || DEFAULT_MISSION.code;
    if (startingRef.current || sessionKeyRef.current === missionCode) return;

    startingRef.current = true;
    try {
      const res = await createSession({
        username: getPlayerName(),
        missionCode,
      });
      if (!res.ok) return;

      const data = res.data?.data;
      if (!data?.sessionId) return;

      sessionIdRef.current = data.sessionId;
      sessionKeyRef.current = missionCode;
      applyServerProgress(data);
      await flushPendingZones();

      if ((data.progress ?? 0) >= 100) await markMissionComplete();
    } finally {
      startingRef.current = false;
    }
  }, [mission.code, applyServerProgress, flushPendingZones, markMissionComplete]);

  useEffect(() => {
    startSession();
  }, [startSession]);

  // Retry the session if the backend was down at load, and retry unsaved
  // zones periodically so a short outage heals itself.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!sessionIdRef.current) {
        startSession();
      } else if (pendingZonesRef.current.size > 0) {
        flushPendingZones();
      }
    }, PENDING_RETRY_MS);

    return () => clearInterval(timer);
  }, [startSession, flushPendingZones]);

  // Called once each time the player enters a zone (ZoneDetector handles the
  // per-frame "am I still inside?" part). The visited list makes it idempotent:
  // re-entering a known zone changes nothing.
  const handleZoneDiscover = useCallback(
    (zone) => {
      if (!zone?.id) return;

      if (visitedZones.includes(zone.id)) {
        if (pendingZonesRef.current.size > 0) flushPendingZones();
        return;
      }

      setVisitedZones((current) => mergeVisitedZones(current, [zone.id]));
      setNotification({ id: zone.id, name: zone.name, token: Date.now() });
      persistZone(zone.id);
    },
    [visitedZones, persistZone, flushPendingZones]
  );

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
        <ZoneDetector targetRef={playerRef} onDiscover={handleZoneDiscover} />
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

        <div
          className="mission-progress"
          role="progressbar"
          aria-label="Mission progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.progress}
        >
          <span style={{ width: `${summary.progress}%` }} />
        </div>

        <div className="mission-progress-meta">
          <small>
            OBJECTIVE: {(mission.objective || "").toUpperCase() || "EXPLORE THE ENVIRONMENT"}
          </small>
          <span className="mission-percentage">{summary.progress}%</span>
        </div>

        <div className="zone-summary">
          <div>
            <span className="zone-summary-title">
              EXPLORED ({summary.explored.length}/{summary.totalCount})
            </span>
            {summary.explored.length > 0 ? (
              <ul>
                {summary.explored.map((zone) => (
                  <li key={zone.id}>{zone.name}</li>
                ))}
              </ul>
            ) : (
              <p className="zone-empty">None yet</p>
            )}
          </div>

          <div>
            <span className="zone-summary-title">REMAINING</span>
            {summary.remaining.length > 0 ? (
              <ul>
                {summary.remaining.map((zone) => (
                  <li key={zone.id}>{zone.name}</li>
                ))}
              </ul>
            ) : (
              <p className="zone-empty">All zones explored</p>
            )}
          </div>
        </div>
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

      {notification && (
        <div className="zone-toast" role="status" key={notification.token}>
          <span className="zone-toast-eyebrow">ZONE DISCOVERED</span>
          <strong>{notification.name}</strong>
        </div>
      )}

      {summary.isComplete && (
        <div className="mission-complete" role="status">
          <span className="mission-complete-eyebrow">
            MISSION {mission.code || "001"} COMPLETE
          </span>
          <strong>Mission Completed</strong>
          <p>All five classroom zones explored.</p>
        </div>
      )}
    </main>
  );
}
