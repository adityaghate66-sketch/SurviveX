import { Link } from 'react-router-dom';
import Avatar from '../Avatar.jsx';
import { useAuth } from '../context/useAuth.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
}

export default function ProfilePage() {
  const { player } = useAuth();

  return (
    <div className="sx-account">
      <div className="sx-container">
        <header className="sx-page-head">
          <div className="sx-page-head__identity">
            <Avatar username={player?.username} size="lg" />
            <div>
              <span className="sx-eyebrow">PLAYER PROFILE</span>
              <h1>{player?.username || 'Player'}</h1>
              <p>Account details from your registered player record.</p>
            </div>
          </div>
          <div className="sx-page-head__actions">
            <Link className="sx-btn sx-btn--ghost" to="/dashboard">
              Dashboard
            </Link>
            <Link className="sx-btn sx-btn--ghost" to="/settings">
              Settings
            </Link>
            <a className="sx-btn sx-btn--primary" href="/">
              Enter World
            </a>
          </div>
        </header>

        <section className="sx-panel sx-profile">
          <div className="sx-panel__head">
            <div>
              <span className="sx-eyebrow">ACCOUNT</span>
              <h2>Player details</h2>
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
            <div>
              <dt>Member since</dt>
              <dd>{formatDate(player?.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatDate(player?.updatedAt)}</dd>
            </div>
          </dl>

          <p className="sx-profile__note">
            Your avatar uses the first letter of your username because custom
            avatars are not available yet. Password hashes and other sensitive
            fields are never sent to the browser.
          </p>
        </section>

        <section className="sx-panel sx-panel--achievements">
          <div className="sx-panel__head">
            <div>
              <span className="sx-eyebrow">PROGRESS</span>
              <h2>Mission history</h2>
            </div>
          </div>
          <div className="sx-empty sx-empty--compact">
            <strong>Your session history lives on the dashboard.</strong>
            <p>
              It is built from real game sessions, so it is shown there rather
              than duplicated here.
            </p>
            <Link className="sx-btn sx-btn--ghost" to="/dashboard">
              View dashboard
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
