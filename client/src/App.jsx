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
  getSessionProgress,
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
const SESSION_KEY = "survivex.session";
const PENDING_RETRY_MS = 8000;

// Plain-language messages shown to the player. Technical details stay in the
// console/network tab, never in the UI.
const ERROR_MESSAGES = {
  offline: "Can't reach the game server right now. Check your connection, then try again.",
  expired: "Your saved session has expired. Start the mission to begin a new one.",
  failed: "We couldn't start your mission. Please try again.",
};

// A stable, non-secret display name per browser. The backend uses it to find
// the player's existing active session instead of creating a new one on every
// reload. If localStorage is unavailable we still play, just as "guest".
function getPlayerName() {
  try {
    const stored = window.localStorage.getItem(PLAYER_NAME_KEY);
    if (stored) return stored;

    // 12 hex characters from a UUID: unique enough that two players never share
    // a guest account, and it matches the backend's username rules.
    const random =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
        : Math.random().toString(36).slice(2, 14).padEnd(12, "0");

    const generated = `player-${random}`;
    window.localStorage.setItem(PLAYER_NAME_KEY, generated);
    return generated;
  } catch {
    return "guest";
  }
}

// Only the session id and its mission are persisted. Progress is never stored
// locally as the source of truth: it is always re-read from the API so the
// database stays authoritative.
function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.missionCode !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(sessionId, missionCode) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId, missionCode }));
  } catch {
    // Private mode / quota: the session still works for this page view.
  }
}

function clearStoredSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export default function App() {
  // Shared handle on the player's 3D group so the camera can follow it.
  const playerRef = useRef(null);

  // The single source of truth for mission progress. The percentage shown in
  // the UI is derived from this list, never stored separately.
  const [visitedZones, setVisitedZones] = useState([]);
  const [notification, setNotification] = useState(null);
  const [activeProp, setActiveProp] = useState(null);

  const [backendStatus, setBackendStatus] = useState({ loading: true });
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [missionSource, setMissionSource] = useState("local");
  const [missionState, setMissionState] = useState("loading"); // loading | backend | fallback

  // Where the player is in the session flow. The classroom is only playable in
  // "playing", which is reachable only after the API confirmed a session.
  // A stored session means there is something to restore; otherwise the player
  // starts straight at the Start Mission button.
  const [phase, setPhase] = useState(() => (readStoredSession() ? "restoring" : "idle"));
  const [sessionError, setSessionError] = useState(null);

  // Phase 2A: Disaster state (none | earthquake | aftermath)
  const [disasterState, setDisasterState] = useState("none");

  // Press 'E' during gameplay to trigger earthquake for testing Phase 2
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyE" && phase === "playing" && disasterState === "none") {
        setDisasterState("earthquake");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, disasterState]);

  // Persistence plumbing. Refs keep async callbacks from depending on state
  // that may change while a request is in flight.
  const restoredRef = useRef(false);
  const sessionIdRef = useRef(null);
  const sessionKeyRef = useRef(null);
  const startingRef = useRef(false);
  const pendingZonesRef = useRef(new Set());
  const flushingRef = useRef(false);

  const summary = useMemo(() => getMissionSummary(visitedZones), [visitedZones]);

  // Give a brand-new player their guest identity immediately, so the same name
  // is reused even if they refresh before ever starting the mission.
  useEffect(() => {
    getPlayerName();
  }, []);

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

  // Restore the session this browser used last time. GET is deliberately the
  // source of truth: if the session was deleted or no longer belongs to this
  // guest, the API answers 404 and we ask the player to start again instead of
  // trusting a stale localStorage value.
  const restoreSession = useCallback(
    async (missionCode) => {
      const stored = readStoredSession();
      if (!stored || stored.missionCode !== missionCode) {
        setPhase("idle");
        return;
      }

      const res = await getSessionProgress(stored.sessionId);

      if (res.ok && res.data?.success) {
        const data = res.data.data;
        sessionIdRef.current = data.sessionId;
        sessionKeyRef.current = missionCode;
        applyServerProgress(data);
        setSessionError(null);
        setPhase("playing");

        if ((data.progress ?? 0) >= 100 && data.status !== "COMPLETED") {
          await markMissionComplete();
        }
        return;
      }

      if (res.status === 404) {
        clearStoredSession();
        setSessionError(ERROR_MESSAGES.expired);
      } else {
        setSessionError(ERROR_MESSAGES.offline);
      }
      setPhase("idle");
    },
    [applyServerProgress, markMissionComplete]
  );

  // Runs once, as soon as the mission code is known (backend data or fallback).
  useEffect(() => {
    if (restoredRef.current || missionState === "loading") return;
    restoredRef.current = true;
    restoreSession(mission.code || DEFAULT_MISSION.code);
  }, [missionState, mission.code, restoreSession]);

  // Called by the Start Mission button. POST /api/sessions answers with the
  // player's existing ACTIVE session for this mission when there is one, so a
  // repeat click resumes instead of creating a duplicate.
  const startMission = useCallback(async () => {
    if (startingRef.current) return;

    const missionCode = mission.code || DEFAULT_MISSION.code;
    startingRef.current = true;
    setSessionError(null);
    setPhase("starting");

    try {
      const res = await createSession({
        username: getPlayerName(),
        missionCode,
      });

      const data = res.ok ? res.data?.data : null;
      if (!data?.sessionId) {
        setSessionError(res.status === 0 ? ERROR_MESSAGES.offline : ERROR_MESSAGES.failed);
        setPhase("idle");
        return;
      }

      sessionIdRef.current = data.sessionId;
      sessionKeyRef.current = missionCode;
      writeStoredSession(data.sessionId, missionCode);
      applyServerProgress(data);
      setPhase("playing");

      await flushPendingZones();

      if ((data.progress ?? 0) >= 100 && data.status !== "COMPLETED") {
        await markMissionComplete();
      }
    } finally {
      startingRef.current = false;
    }
  }, [mission.code, applyServerProgress, flushPendingZones, markMissionComplete]);

  // Retry zones that failed to save during a short outage. Sessions are never
  // created from a timer: that only happens on an explicit Start Mission click.
  useEffect(() => {
    const timer = setInterval(() => {
      if (sessionIdRef.current && pendingZonesRef.current.size > 0) {
        flushPendingZones();
      }
    }, PENDING_RETRY_MS);

    return () => clearInterval(timer);
  }, [flushPendingZones]);

  // Called once each time the player enters a zone (ZoneDetector handles the
  // per-frame "am I still inside?" part). The visited list makes it idempotent:
  // re-entering a known zone changes nothing.
  const handleZoneDiscover = useCallback(
    (zone) => {
      // Nothing can be discovered before the API has confirmed a session.
      if (phase !== "playing" || !zone?.id) return;

      if (visitedZones.includes(zone.id)) {
        if (pendingZonesRef.current.size > 0) flushPendingZones();
        return;
      }

      setVisitedZones((current) => mergeVisitedZones(current, [zone.id]));
      setNotification({ id: zone.id, name: zone.name, token: Date.now() });
      persistZone(zone.id);
    },
    [phase, visitedZones, persistZone, flushPendingZones]
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
          setMissionState("backend");
        } else {
          // The briefing below the card comes from DEFAULT_MISSION; the code it
          // carries (001) still exists on the backend, so the mission can start.
          setMissionState("fallback");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setBackendStatus({ loading: false, connected: false, message: err.message });
        setMissionState((current) => (current === "loading" ? "fallback" : current));
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
          position: [-1.6, 8, 6.9 + 10.5],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
      >
        <color attach="background" args={["#A9C9DC"]} />

        <Classroom activeProp={activeProp} />
        <Player bodyRef={playerRef} active={phase === "playing"} sessionId={sessionIdRef.current} activeProp={activeProp} />
        <FollowCamera targetRef={playerRef} disasterState={disasterState} />
        <ZoneDetector
          targetRef={playerRef}
          enabled={phase === "playing"}
          onDiscover={handleZoneDiscover}
        />
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

        {/* The briefing doubles as the mission introduction panel: the
            classroom only becomes playable once the API has a session. */}
        <div className="mission-actions">
          {phase === "playing" ? (
            <p className="mission-session">
              <span className="status-dot" />
              MISSION IN PROGRESS
            </p>
          ) : (
            <button
              type="button"
              className="mission-start"
              onClick={startMission}
              disabled={phase === "starting" || phase === "restoring" || missionState === "loading"}
            >
              {phase === "starting"
                ? "STARTING…"
                : phase === "restoring"
                  ? "RESTORING…"
                  : "START MISSION"}
            </button>
          )}

          {missionState === "loading" && (
            <p className="mission-hint">Loading mission…</p>
          )}
          {missionState === "fallback" && (
            <p className="mission-hint">
              Briefing unavailable from the server — using the built-in mission.
            </p>
          )}
          {sessionError && (
            <p className="mission-error" role="alert">
              {sessionError}
            </p>
          )}
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

      {disasterState === "earthquake" && (
        <div className="disaster-banner" role="alert">
          <span className="disaster-eyebrow">EMERGENCY ALERT</span>
          <strong>EARTHQUAKE DETECTED!</strong>
          <p>Drop, Cover, and Hold On! Find a safe spot under the student desks.</p>
        </div>
      )}

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
