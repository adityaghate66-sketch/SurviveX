import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMissions, getPlayerSummary } from '../../services/api.js';
import Avatar from '../Avatar.jsx';
import { useAuth } from '../context/useAuth.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

function statusLabel(status) {
  return status
    ? status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')
    : '—';
}

export default function DashboardPage() {
  const { token, player } = useAuth();
  const [summary, setSummary] = useState(null);
  const [missions, setMissions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getPlayerSummary(token), getMissions()])
      .then(([playerSummary, missionList]) => {
        if (!active) return;
        setSummary(playerSummary);
        setMissions(Array.isArray(missionList) ? missionList : []);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || 'Unable to load your dashboard.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const stats = summary?.stats;

  return (
    <div className="sx-account">
      <div className="sx-container">
        <header className="sx-page-head">
          <div className="sx-page-head__identity">
            <Avatar username={player?.username} size="lg" />
            <div>
              <span className="sx-eyebrow">PLAYER DASHBOARD</span>
              <h1>Welcome back, {player?.username || 'player'}.</h1>
              <p>
                Your missions, progress and activity — straight from the game
                database.
              </p>
            </div>
          </div>
          <div className="sx-page-head__actions">
            <Link className="sx-btn sx-btn--ghost" to="/profile">
              Profile
            </Link>
            <Link className="sx-btn sx-btn--ghost" to="/settings">
              Settings
            </Link>
            <a className="sx-btn sx-btn--primary" href="/">
              Enter World <span aria-hidden="true">→</span>
            </a>
          </div>
        </header>

        {loading ? (
          <div className="sx-state" role="status">
            Loading your dashboard…
          </div>
        ) : null}

        {error ? (
          <div className="sx-state sx-state--error" role="alert">
            <strong>Could not load your data.</strong>
            <p>{error}</p>
          </div>
        ) : null}

        {summary && !error ? (
          <>
            <section className="sx-stat-grid" aria-label="Player statistics">
              <article className="sx-stat">
                <span>Missions completed</span>
                <strong>{stats.missionsCompleted}</strong>
                <small>Distinct missions finished</small>
              </article>
              <article className="sx-stat">
                <span>Completed sessions</span>
                <strong>{stats.completedSessions}</strong>
                <small>Of {stats.totalSessions} total sessions</small>
              </article>
              <article className="sx-stat">
                <span>Active sessions</span>
                <strong>{stats.activeSessions}</strong>
                <small>Currently in progress</small>
              </article>
              <article className="sx-stat">
                <span>Zone discoveries</span>
                <strong>{stats.zonesDiscovered}</strong>
                <small>Across all sessions</small>
              </article>
            </section>

            <div className="sx-dash-grid">
              <section className="sx-panel">
                <div className="sx-panel__head">
                  <div>
                    <span className="sx-eyebrow">HISTORY</span>
                    <h2>Recent activity</h2>
                  </div>
                  <span className="sx-panel__count">
                    {summary.recentActivity.length}
                  </span>
                </div>

                {summary.recentActivity.length ? (
                  <ul className="sx-activity">
                    {summary.recentActivity.map((item) => (
                      <li key={item.sessionId}>
                        <span
                          className={`sx-activity__dot sx-activity__dot--${item.status.toLowerCase()}`}
                          aria-hidden="true"
                        />
                        <div className="sx-activity__body">
                          <strong>
                            {item.mission?.title || 'Mission unavailable'}
                          </strong>
                          <span>
                            {statusLabel(item.status)} · {item.progress}% ·{' '}
                            {formatDate(item.startedAt)}
                          </span>
                        </div>
                        <span className="sx-activity__code">
                          {item.mission?.code || '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="sx-empty">
                    <strong>No sessions yet.</strong>
                    <p>
                      Enter the world to start your first mission. Activity will
                      appear here once a session exists.
                    </p>
                    <a className="sx-btn sx-btn--primary" href="/">
                      Enter the World
                    </a>
                  </div>
                )}
              </section>

              <section className="sx-panel">
                <div className="sx-panel__head">
                  <div>
                    <span className="sx-eyebrow">AVAILABLE NOW</span>
                    <h2>Missions</h2>
                  </div>
                  <span className="sx-panel__count">{missions.length}</span>
                </div>

                {missions.length ? (
                  <ul className="sx-missions">
                    {missions.map((mission) => (
                      <li key={mission.id}>
                        <span className="sx-missions__code">{mission.code}</span>
                        <div>
                          <strong>{mission.title}</strong>
                          <p>{mission.description}</p>
                          <small>
                            {mission.mode === 'SCENARIO'
                              ? 'Scenario'
                              : 'Training'}{' '}
                            · {mission.objective}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="sx-empty">
                    <strong>No active missions.</strong>
                    <p>Check back later or start a guest session in the game.</p>
                  </div>
                )}
              </section>
            </div>

            <section className="sx-panel sx-panel--achievements">
              <div className="sx-panel__head">
                <div>
                  <span className="sx-eyebrow">RECOGNITION</span>
                  <h2>Achievements</h2>
                </div>
              </div>
              <div className="sx-empty sx-empty--compact">
                <strong>Achievements are not implemented yet.</strong>
                <p>
                  Nothing is shown here until achievements exist in the game.
                  No placeholders have been added.
                </p>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
