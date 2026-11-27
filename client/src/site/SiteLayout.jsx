import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './context/useAuth.js';

function Logo() {
  return (
    <Link to="/welcome" className="sx-logo" aria-label="SurviveX home">
      <span className="sx-logo__mark" aria-hidden="true" />
      <span className="sx-logo__word">
        SURVIVE<span>X</span>
      </span>
    </Link>
  );
}

export default function SiteLayout() {
  const { isAuthenticated, player, ready, signOut } = useAuth();

  // The game mounts a fixed, non-scrolling full-screen canvas at `/`. Site
  // pages need normal document scrolling, so enable it only while this layout
  // is mounted and restore the game's default on the way out.
  useEffect(() => {
    document.body.classList.add('site-mode');
    return () => document.body.classList.remove('site-mode');
  }, []);

  return (
    <div className="site-root">
      <header className="sx-header">
        <div className="sx-header__inner">
          <Logo />

          <nav className="sx-nav" aria-label="Main navigation">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/profile">Profile</Link>
                <Link to="/settings">Settings</Link>
              </>
            ) : (
              <>
                <Link to="/welcome#about">About</Link>
                <Link to="/welcome#world">The World</Link>
                <Link to="/welcome#disasters">Disasters</Link>
                <Link to="/welcome#gameplay">Gameplay</Link>
              </>
            )}
          </nav>

          <div className="sx-header__actions">
            <a className="sx-btn sx-btn--small sx-btn--ghost" href="/">
              Enter World
            </a>
            {ready &&
              (isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="sx-user"
                    title={player?.email || ''}
                  >
                    <span className="sx-user__avatar" aria-hidden="true">
                      {(player?.username || 'P').charAt(0).toUpperCase()}
                    </span>
                    <span className="sx-user__name">{player?.username}</span>
                  </Link>
                  <button
                    type="button"
                    className="sx-btn sx-btn--small sx-btn--quiet"
                    onClick={signOut}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="sx-btn sx-btn--small sx-btn--quiet"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="sx-btn sx-btn--small sx-btn--primary"
                  >
                    Join now
                  </Link>
                </>
              ))}
          </div>
        </div>
      </header>

      <main className="sx-main">
        <Outlet />
      </main>

      <footer className="sx-footer">
        <div className="sx-footer__inner">
          <div className="sx-footer__brand">
            <Logo />
            <p>PLAY. PREPARE. SURVIVE.</p>
          </div>
          <div className="sx-footer__links">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/profile">Profile</Link>
                <Link to="/settings">Settings</Link>
              </>
            ) : (
              <>
                <Link to="/welcome#about">About</Link>
                <Link to="/welcome#world">The World</Link>
                <Link to="/welcome#gameplay">Gameplay</Link>
                <Link to="/login">Sign in</Link>
                <Link to="/signup">Create account</Link>
              </>
            )}
          </div>
          <p className="sx-footer__note">
            SurviveX is a disaster survival experience. Prepare before you play.
          </p>
        </div>
      </footer>
    </div>
  );
}
