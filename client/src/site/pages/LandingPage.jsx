import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

const ENVIRONMENTS = [
  {
    id: 'coastal',
    index: '001',
    name: 'Coastal District',
    label: 'ENVIRONMENT 001',
    description:
      'Move through a storm-battered coastal district. Read the terrain, watch the water, and keep your team together when the ground starts to shift.',
    tags: ['Open district', 'Search & rescue', 'Live hazards'],
  },
  {
    id: 'classroom',
    index: '002',
    name: 'Classroom',
    label: 'ENVIRONMENT 002',
    description:
      'A training space for the fundamentals. Learn the controls, practise zone objectives, and understand what to do before the real scenario begins.',
    tags: ['Training mode', 'Guided objectives', 'Foundation'],
  },
];

const DISASTERS = [
  {
    name: 'Earthquake',
    code: 'SEISMIC EVENT',
    description:
      'The ground gives way without warning. Camera shake, unstable movement, and an urgent window to get your bearings and reach safety.',
  },
  {
    name: 'Fire',
    code: 'FIRE EVENT',
    description:
      'Smoke spreads and the clock starts. Locate the extinguisher, work as a team, and put the outbreak down before it takes the district.',
  },
];

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="sx-section-heading">
      <span className="sx-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Hash links in the header/footer use React Router, which does not scroll
  // natively. Do it here so every section link behaves like a normal anchor.
  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, location.pathname]);

  return (
    <>
      {/* HERO */}
      <section className="sx-hero" id="top">
        <div className="sx-hero__grid" aria-hidden="true" />
        <div className="sx-hero__glow" aria-hidden="true" />
        <div className="sx-hero__horizon" aria-hidden="true" />
        <div className="sx-hero__beacon" aria-hidden="true" />

        <div className="sx-hero__content">
          <span className="sx-hero__kicker">
            <span className="sx-live-dot" aria-hidden="true" />
            MULTIPLAYER DISASTER SURVIVAL
          </span>

          <h1 className="sx-hero__title">
            SURVIVE<span>X</span>
          </h1>
          <p className="sx-tagline">PLAY. PREPARE. SURVIVE.</p>
          <p className="sx-hero__lede">
            Explore hostile environments, respond to disasters, and learn the
            skills that keep people alive. Every decision matters when the
            world turns against you.
          </p>

          <div className="sx-hero__actions">
            <a className="sx-btn sx-btn--primary sx-btn--large" href="/">
              Enter the World <span aria-hidden="true">→</span>
            </a>
            <Link className="sx-btn sx-btn--ghost sx-btn--large" to="/welcome#about">
              Discover the mission
            </Link>
          </div>

          <div className="sx-hero__meta">
            <span>Two environments</span>
            <span className="sx-hero__sep" aria-hidden="true" />
            <span>Team-based response</span>
            <span className="sx-hero__sep" aria-hidden="true" />
            <span>Live disaster events</span>
          </div>
        </div>

        <div className="sx-hero__scroll" aria-hidden="true">
          <span>SCROLL</span>
          <i />
        </div>
      </section>

      {/* ABOUT */}
      <section className="sx-section sx-section--about" id="about">
        <div className="sx-container sx-split">
          <div className="sx-split__copy">
            <SectionHeading eyebrow="01 / THE MISSION" title="Survival is a skill. Learn it under pressure.">
              <p>
                SurviveX puts you inside a disaster scenario with other players.
                You will navigate the environment, complete objectives, and
                react when events escalate — all while your team works toward the
                same goal.
              </p>
              <p>
                It is a game first, but the instincts it builds are real:
                situational awareness, clear communication, and calm decisions
                when the situation stops being calm.
              </p>
            </SectionHeading>
            <div className="sx-signature-list">
              <div>
                <strong>Play</strong>
                <span>Drop into a live scenario with your team.</span>
              </div>
              <div>
                <strong>Prepare</strong>
                <span>Learn the environment before the disaster hits.</span>
              </div>
              <div>
                <strong>Survive</strong>
                <span>Adapt, respond, and make it through together.</span>
              </div>
            </div>
          </div>

          <div className="sx-visual sx-visual--about" aria-hidden="true">
            <div className="sx-visual__scan" />
            <div className="sx-radar">
              <span className="sx-radar__ring" />
              <span className="sx-radar__ring sx-radar__ring--two" />
              <span className="sx-radar__core" />
            </div>
            <div className="sx-visual__readout">
              <span>STATUS</span>
              <strong>RESPONSE ACTIVE</strong>
            </div>
          </div>
        </div>
      </section>

      {/* WORLD */}
      <section className="sx-section sx-section--world" id="world">
        <div className="sx-container">
          <SectionHeading eyebrow="02 / EXPLORE THE WORLD" title="Two environments. One objective.">
            From the training room to the coast, every space is built to test a
            different part of your instincts.
          </SectionHeading>

          <div className="sx-card-grid">
            {ENVIRONMENTS.map((environment) => (
              <article className="sx-world-card" key={environment.id}>
                <div
                  className={`sx-world-card__art sx-world-card__art--${environment.id}`}
                  aria-hidden="true"
                >
                  <span className="sx-world-card__index">{environment.index}</span>
                </div>
                <div className="sx-world-card__body">
                  <span className="sx-eyebrow">{environment.label}</span>
                  <h3>{environment.name}</h3>
                  <p>{environment.description}</p>
                  <div className="sx-tags">
                    {environment.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DISASTERS */}
      <section className="sx-section sx-section--disasters" id="disasters">
        <div className="sx-container">
          <SectionHeading eyebrow="03 / DISASTER TYPES" title="When the scenario escalates, so do you.">
            Events are triggered live during play. Your team has to read the
            situation and act together — there is no script to hide behind.
          </SectionHeading>

          <div className="sx-disaster-grid">
            {DISASTERS.map((disaster) => (
              <article className="sx-disaster-card" key={disaster.name}>
                <span className="sx-disaster-card__code">{disaster.code}</span>
                <h3>{disaster.name}</h3>
                <p>{disaster.description}</p>
                <span className="sx-disaster-card__line" aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GAMEPLAY */}
      <section className="sx-section sx-section--gameplay" id="gameplay">
        <div className="sx-container sx-split">
          <div className="sx-split__copy">
            <SectionHeading eyebrow="04 / HOW IT PLAYS" title="Move, respond, learn. Repeat.">
              A session progresses through objectives in the world. The server
              tracks your progress, so the team always knows where it stands.
            </SectionHeading>
            <ol className="sx-steps">
              <li>
                <span>01</span>
                <div>
                  <strong>Enter the environment</strong>
                  <p>Choose your scenario and join the world with your team.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Explore and complete objectives</strong>
                  <p>Discover zones and work through the mission together.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Respond when disaster strikes</strong>
                  <p>Stay aware, communicate, and handle the event as a team.</p>
                </div>
              </li>
              <li>
                <span>04</span>
                <div>
                  <strong>Carry the lessons out</strong>
                  <p>Turn what you practised into real-world preparedness.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="sx-visual sx-visual--gameplay" aria-hidden="true">
            <div className="sx-progress-demo">
              <div className="sx-progress-demo__top">
                <span>MISSION PROGRESS</span>
                <strong>SERVER-TRACKED</strong>
              </div>
              <div className="sx-progress-demo__track">
                <i />
              </div>
              <div className="sx-progress-demo__zones">
                <span>01</span>
                <span>02</span>
                <span>03</span>
                <span>04</span>
                <span>05</span>
              </div>
            </div>
            <div className="sx-visual__caption">
              Objective progress is validated by the server, not the browser.
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="sx-final" id="join">
        <div className="sx-final__glow" aria-hidden="true" />
        <div className="sx-container sx-final__inner">
          <span className="sx-eyebrow">YOUR SCENARIO STARTS HERE</span>
          <h2>
            Stop watching.<br />
            Start surviving.
          </h2>
          <p>
            Create an account to keep your identity ready for the next mission,
            or jump straight into the world as a guest.
          </p>
          <div className="sx-final__actions">
            {isAuthenticated ? (
              <a className="sx-btn sx-btn--primary sx-btn--large" href="/">
                Enter the World <span aria-hidden="true">→</span>
              </a>
            ) : (
              <Link className="sx-btn sx-btn--primary sx-btn--large" to="/signup">
                Create your account <span aria-hidden="true">→</span>
              </Link>
            )}
            <Link
              className="sx-btn sx-btn--ghost sx-btn--large"
              to={isAuthenticated ? '/welcome#top' : '/login'}
            >
              {isAuthenticated ? 'Back to top' : 'I already have an account'}
            </Link>
          </div>
          <p className="sx-final__tagline">PLAY. PREPARE. SURVIVE.</p>
        </div>
      </section>
    </>
  );
}
