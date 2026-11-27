import { useEffect } from 'react';

// Shared cinematic frame for the three account pages.
export default function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="sx-auth">
      <div className="sx-auth__visual" aria-hidden="true">
        <div className="sx-auth__visual-grid" />
        <div className="sx-auth__visual-glow" />
        <div className="sx-auth__visual-content">
          <span className="sx-eyebrow">SURVIVEX / ACCOUNT ACCESS</span>
          <p className="sx-auth__visual-word">
            SURVIVE<span>X</span>
          </p>
          <p className="sx-auth__visual-tagline">PLAY. PREPARE. SURVIVE.</p>
          <div className="sx-auth__visual-line" />
          <p className="sx-auth__visual-note">
            Your account keeps your identity ready for every mission.
          </p>
        </div>
      </div>

      <div className="sx-auth__panel">
        <div className="sx-auth__card">
          <span className="sx-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {subtitle ? <p className="sx-auth__subtitle">{subtitle}</p> : null}
          {children}
          {footer ? <div className="sx-auth__footer">{footer}</div> : null}
        </div>
      </div>
    </section>
  );
}
