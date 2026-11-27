import { Link } from 'react-router-dom';
import Avatar from '../Avatar.jsx';
import { useAuth } from '../context/useAuth.js';

export default function SettingsPage() {
  const { player, signOut } = useAuth();

  return (
    <div className="sx-account">
      <div className="sx-container">
        <header className="sx-page-head">
          <div className="sx-page-head__identity">
            <Avatar username={player?.username} size="lg" />
            <div>
              <span className="sx-eyebrow">ACCOUNT SETTINGS</span>
              <h1>Settings</h1>
              <p>Manage the account you use in SurviveX.</p>
            </div>
          </div>
          <div className="sx-page-head__actions">
            <Link className="sx-btn sx-btn--ghost" to="/dashboard">
              Dashboard
            </Link>
            <Link className="sx-btn sx-btn--ghost" to="/profile">
              Profile
            </Link>
          </div>
        </header>

        <section className="sx-panel">
          <div className="sx-panel__head">
            <div>
              <span className="sx-eyebrow">ACCOUNT</span>
              <h2>Your details</h2>
            </div>
          </div>
          <dl className="sx-details">
            <div>
              <dt>Username</dt>
              <dd>{player?.username || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{player?.email || '—'}</dd>
            </div>
          </dl>
          <div className="sx-notice sx-notice--neutral">
            <span className="sx-notice__icon" aria-hidden="true">
              i
            </span>
            <div>
              <strong>Editing account details is not available yet.</strong>
              <p>
                Username and email changes need a protected update endpoint
                before this page can offer them safely.
              </p>
            </div>
          </div>
        </section>

        <section className="sx-panel">
          <div className="sx-panel__head">
            <div>
              <span className="sx-eyebrow">SECURITY</span>
              <h2>Password</h2>
            </div>
          </div>
          <div className="sx-notice sx-notice--neutral">
            <span className="sx-notice__icon" aria-hidden="true">
              i
            </span>
            <div>
              <strong>Password change is not available yet.</strong>
              <p>
                Self-service password reset and password changes are still being
                built. This page will not pretend to send a reset email.
              </p>
            </div>
          </div>
        </section>

        <section className="sx-panel">
          <div className="sx-panel__head">
            <div>
              <span className="sx-eyebrow">SESSION</span>
              <h2>Sign out</h2>
            </div>
          </div>
          <p className="sx-settings__copy">
            Signing out revokes your current token on the server, so this device
            will need to sign in again. It does not affect other devices.
          </p>
          <button
            type="button"
            className="sx-btn sx-btn--primary"
            onClick={signOut}
          >
            Sign out of SurviveX
          </button>
        </section>
      </div>
    </div>
  );
}
