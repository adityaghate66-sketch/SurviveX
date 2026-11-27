import { useState } from 'react';
import { Link } from 'react-router-dom';
import App from '../App.jsx';
import { readSession } from './services/authStorage.js';
import { hasEnteredWorld, markEnteredWorld } from './services/entryStorage.js';

// The game stays mounted at `/`, but nothing inside App.jsx runs until the
// player chooses to enter. Signed-in players skip the gate because they have
// already come through the site; guests get the cinematic entry screen once
// per browser tab.
export default function GameEntryGate() {
  const [entered, setEntered] = useState(
    () => hasEnteredWorld() || Boolean(readSession()?.player?.id)
  );

  function enterWorld() {
    markEnteredWorld();
    setEntered(true);
  }

  if (entered) return <App />;

  return (
    <div
      className="site-root sx-entry"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sx-entry-title"
    >
      <div className="sx-entry__grid" aria-hidden="true" />
      <div className="sx-entry__glow" aria-hidden="true" />

      <div className="sx-entry__content">
        <span className="sx-entry__kicker">
          <span className="sx-live-dot" aria-hidden="true" />
          MULTIPLAYER DISASTER SURVIVAL
        </span>

        <h1 id="sx-entry-title" className="sx-entry__title">
          SURVIVE<span>X</span>
        </h1>
        <p className="sx-tagline">PLAY. PREPARE. SURVIVE.</p>
        <p className="sx-entry__copy">
          Before you enter the world, decide how you want to play. Explore as a
          guest, or sign in to save your missions and track your progress.
        </p>

        <div className="sx-entry__actions">
          <button
            type="button"
            className="sx-btn sx-btn--primary sx-btn--large"
            onClick={enterWorld}
          >
            Enter World <span aria-hidden="true">→</span>
          </button>
          <Link className="sx-btn sx-btn--ghost sx-btn--large" to="/login">
            Sign in
          </Link>
          <Link className="sx-btn sx-btn--ghost sx-btn--large" to="/signup">
            Create account
          </Link>
        </div>

        <p className="sx-entry__note">
          Guest play needs no account. Signing in links your game sessions to
          your player dashboard.
        </p>
      </div>

      <aside className="sx-entry__aside" aria-hidden="true">
        <div>
          <span>01 / ENVIRONMENTS</span>
          <strong>Classroom · Coastal District</strong>
        </div>
        <div>
          <span>02 / THREATS</span>
          <strong>Live disasters · Fire hazards</strong>
        </div>
        <div>
          <span>03 / MODE</span>
          <strong>Team-based survival</strong>
        </div>
      </aside>
    </div>
  );
}
