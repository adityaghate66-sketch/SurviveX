# SurviveX — Architecture Report (Milestone 1)

Status: **inspection only**. No application code was changed in this milestone. This document is the deliverable.

Repository root: `/Users/aditya.66/surviveX`

---

## 1. Scope and method

Inspected:

- Directory trees for `client/` and `server/` (excluding `node_modules`, `dist`, `.git`).
- `client/package.json`, `server/package.json`, installed/locked dependency versions.
- `server/prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.js`, `prisma.config.js`.
- All Express routes, controllers, services, middleware, config, Colyseus setup, and tests.
- `client/src/**`: entry points, `App.jsx`, components, game logic, services, CSS.
- Env var **names** only (no secret values were read into this report).
- Search for existing auth primitives: `bcrypt`, `jwt`, `cookie`, `session`, `password`, `Authorization`, `req.user`, etc.

## 2. Current stack

| Layer | Technology / versions |
|---|---|
| Frontend | React 19.3.1, Vite 8.3.4, JavaScript (no TypeScript) |
| 3D | Three.js 0.186.1, `@react-three/fiber` 9.8.2, `@react-three/drei` 10.7.9 |
| Multiplayer | Colyseus 0.18.x on both sides (`@colyseus/sdk` 0.18.10 client) |
| Backend | Express 5.3, Node ESM (`"type": "module"`), `engines.node >= 20` |
| Database | PostgreSQL, Prisma 7.10.1 (`@prisma/adapter-pg` + `pg` 8.23) |
| Tests | `node:test` + `node:assert` + global `fetch`; no Jest/Supertest |

Not installed (direct dependency): `bcrypt`, `bcryptjs`, `argon2`, `helmet`, `cookie-parser`, `express-rate-limit`.
Present only transitively via `@colyseus/auth`: `jsonwebtoken` 9.0.3, `express-session` 1.19.0, `zod` 4.6.7. They are **not declared** and must not be imported as if they were first-class dependencies.

## 3. Frontend map (`client/`)

### Entry points and navigation

- `src/main.jsx` → `<StrictMode><App /></StrictMode>` into `#root`; imports `src/index.css`.
- `index.html` is the single built HTML entry. `coastal.html` / `src/coastalMain.jsx` are a dev-only preview and are **not** emitted into `dist/`.
- **There is no router.** No `react-router`, `<Link>`, `useNavigate`, or URL-based navigation. All "pages" are local state in `App.jsx`:
  - `phase`: `idle | restoring | starting | playing` (`App.jsx:152`)
  - `scene`: `classroom | coastal` (`App.jsx:175`)
  - Mission 002 unlocks only after Mission 001 completes.
- Implication: the public website, auth pages and dashboard need a router/site shell, but `/` must keep booting the existing game canvas untouched.

### Game code that must keep working

- One `<Canvas>` under `main.game` (`App.jsx:584-668`); `index.css` sets full-height `html/body/#root` and `body { overflow: hidden }`.
- `useFrame` components must stay inside `<Canvas>`: `Player`, `CoastalPlayer`, `FollowCamera`, `ZoneDetector`, `WorldUpdater`, `RemotePlayer`, `ActionPrompt`, `CoastalWorld` children.
- Shared `playerRef` is passed as `bodyRef` to both player controllers and read by camera/zone detection; do not replace with per-component refs.
- Mission flow is server-authoritative: zone IDs are validated server-side, progress is recomputed from the visited set, and completion requires all five zones. Offline zone writes are queued and retried.
- Multiplayer joins only after a confirmed session; `myPlayerId` must be `room.sessionId` to filter self; `leave()` on unmount. The dynamic `@colyseus/sdk` import produces a separate `build-*.js` chunk — preserve it.
- DEV-only `window.__survivexDebug` (`App.jsx:311-332`) and coastal `window.__coastal` stats must survive.
- Some root `.mjs` probe scripts reference older debug hooks that no longer exist; treat them as historical, not contracts.

### Reusable UI inventory

- DOM/HUD markup is inline in `App.jsx` (header/status pills, mission card, progress bar, buttons, toast, completion panel, controls card). There are **no shared Button/Card/Avatar components and no form inputs**.
- 3D-only components in `src/components/`: `Player`, `CoastalPlayer`, `FollowCamera`, `ZoneDetector`, `WorldUpdater`, `RemotePlayer`, `ActionPrompt`, `SmokeCloud`/`ParticleSystem`.
- `ProgressBar.jsx` and `StatusIndicator.jsx` exist but are unused by the app. `StatusIndicator` already defines a useful status palette (safe `#22c55e`, warning `#f59e0b`, danger `#ef4444`, neutral `#64748b`).
- `services/api.js` is the only REST client. Base URL: `VITE_API_BASE_URL || '/api'`; 12 s `AbortController` timeout; returns `{ ok, status, data }`; errors are `{ success:false, error:{ code, message, details? } }`. It currently sends **no auth header, token or credentials**.
- `services/multiplayer.js` resolves WS from `VITE_WS_URL`, then from `VITE_API_BASE_URL` (stripping `/api`), then `ws(s)://<hostname>:4000`. Falls back to local play if the SDK fails.

### CSS conventions

- Only `src/index.css` (global reset) and `src/App.css` (all game styling). No CSS modules, no design tokens/custom properties.
- Fonts: `DM Sans` (body), `Space Grotesk` (headings/buttons). Imported remotely in `App.css:2`.
- Flat hyphenated classes (`.mission-card`, `.mission-start`, `.status-dot`, `.zone-toast`, etc.), with element selectors for descendants; radii ~11–20 px, glassmorphism with `backdrop-filter`.
- Current palette is light-on-dark ocean blue (`#101923`, `#14283c`) plus game green (`#2a9872`), **not** the requested emergency-orange cinematic identity. New site styles should live in their own stylesheet/token layer rather than rewriting `App.css`.
- Single breakpoint: `@media (max-width: 600px)` (`App.css:444`). Duplicate `.zone-toast` blocks exist at `App.css:292-335` and `496-531`; the later one wins.

## 4. Backend map (`server/`)

### Structure and conventions

```
src/
  app.js               createApp() factory (Express only)
  server.js            Express + Colyseus on one HTTP server
  config/env.js        single frozen config object; only place reading process.env
  config/database.js   lazy singleton PrismaClient via PrismaPg
  constants/zones.js   zone whitelist + progress math
  controllers/         envelope shaping only
  routes/              path → controller mapping only
  services/            validation, Prisma access, transactions, AppError
  middleware/          errorHandler.js, notFound.js
  errors/AppError.js   operational error class (isOperational = true)
  multiplayer/         GameRoom, player schema
  disasters/           disaster + fire event broadcasters
tests/sessionApi.test.js
```

### Existing HTTP API (all under `/api`)

| Method + path | Purpose |
|---|---|
| `GET /health` | API/DB health; 503 when DB is unavailable |
| `GET /missions`, `GET /missions/:id` | Active missions; lookup by id or code |
| `POST /sessions` | Find active session or create one (201 new / 200 reused) |
| `GET /sessions/:sessionId/progress` | Read progress (upserts missing row) |
| `PUT /sessions/:sessionId/progress` | Add validated zone, recompute progress |
| `POST /sessions/:sessionId/complete` | Require all zones, mark COMPLETED (idempotent) |

Envelope: success `{ success: true, data }`; failure `{ success: false, error: { code, message, details? } }`. `AppError` messages are exposed; unexpected 5xx errors are logged and replaced with a generic message. JSON body limit 100 kb. `x-powered-by` disabled.

Validation is hand-written inside services (username regex `^[A-Za-z0-9_-]{3,32}$`, id length ≤ 128, zone whitelist). There is no validation middleware.

### Data model (`prisma/schema.prisma`)

- `User`: `id` (cuid), `username` **unique**, `createdAt`, `updatedAt`, `sessions`.
- `Mission`: `id`, `code` unique, `title`, `description`, `objective`, `mode` (`TRAINING|SCENARIO`), `status` (`ACTIVE|ARCHIVED`), `order`, timestamps.
- `GameSession`: `id`, `userId`, `missionId`, `status` (`ACTIVE|COMPLETED|ABANDONED`), `startedAt`, `completedAt`; indexes on `userId`, `missionId`, `status`.
- `MissionProgress`: `id`, `sessionId` **unique**, `progress` (0–100), `visitedZones` JSON, `updatedAt`.
- Relations/delete rules: `User 1→N GameSession` (Cascade), `Mission 1→N GameSession` (Restrict), `GameSession 1→1 MissionProgress` (Cascade).
- Only one migration: `20261107000000_init`. It includes a `CHECK ("progress" >= 0 AND "progress" <= 100)` constraint that is **not** in `schema.prisma` — a drift risk before generating a new migration.
- `prisma.config.js` uses `DIRECT_URL` for the CLI; runtime and `seed.js` use `DATABASE_URL`. `.env.example` omits `DIRECT_URL`.

### Auth status: none exists

- No `auth/` directory, no auth routes/middleware/services, no password fields, no tokens, no cookies, no `onAuth` in Colyseus.
- `POST /sessions` trusts a caller-supplied `userId` after a `findUnique` check, or auto-creates a `User` from a browser-generated `username`. Session endpoints resolve purely by `sessionId` with **no ownership check**.
- Environment files contain only `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `DATABASE_URL` (plus `DIRECT_URL` in the local `.env`). No auth secret variables.

### CORS / transport caveats

- Express CORS: exact-origin allowlist from `CORS_ORIGIN`; methods `GET, POST, PUT, PATCH, OPTIONS`; **no `credentials: true`**, no `DELETE`.
- Colyseus installs a global CORS hook in `server.js:14-43` on the shared HTTP server. It accepts local/private origins unconditionally. As of Milestone 2 it allows both `Content-Type` and `Authorization` in all three branches; cookies would still need coordinated changes in both places.
- `/colyseus` monitor is mounted after `notFoundHandler`/`errorHandler`, so it is currently shadowed by the 404 handler. Do not reorder without gating it by environment.
- Prisma advisory locks (`survivex-user:*`, `survivex-session:*`, `survivex-progress:*`) serialize duplicate session creation, zone updates and completion. Keep these patterns; extend, do not replace.

### Tests

`npm test` runs `node --test tests/*.test.js`: 21 tests, real Express app on an ephemeral port against a real seeded PostgreSQL. Covers zone rules, sessions, progress, completion, input errors, CORS and parallel-request safety. It does not start Colyseus and does not cover health/missions/auth.

## 5. Proposed architecture for the remaining milestones

Decisions to take into Milestone 2 (needs your approval before implementation):

1. **Extend the existing `User` model** with `email` (unique), `passwordHash`, and account timestamps. Do **not** create a second user model or a second database. Generate a Prisma migration and run `prisma generate`. Reconcile the `CHECK` drift and add `DIRECT_URL` to `.env.example` first.
2. **Password hashing:** add `bcrypt` as an explicit dependency; hash before create, compare on login; never select `passwordHash` into API responses (use an explicit safe `presentUser` projection).
3. **Auth strategy:** bearer tokens (JWT) fit the current stateless API and the Colyseus room join options better than browser sessions, but cookies would also work if CORS is updated. This is the main open decision — confirm preferred mechanism before Milestone 2. Either way: add `src/config/auth.js`, `src/middleware/auth.js`, auth routes under `/api/auth`, and a `GET /api/auth/me`.
4. **Preserve guest play:** keep `POST /sessions` accepting `username` for unauthenticated players; when a real `userId` is available, pass it. Add optional ownership checks for session routes only after a token exists, so the deployed game is not broken.
5. **Website shell:** add a router (e.g. `react-router-dom`) with public routes (`/`, `/login`, `/signup`, `/forgot-password`) and protected routes (`/dashboard`, `/profile`, `/settings`). Keep `/` rendering the current `App` game canvas; mount marketing/auth/dashboard pages as separate DOM trees, never wrapping the canvas in scroll containers.
6. **Styling:** introduce a dedicated token layer (charcoal `#101318`/storm `#1b2530`, ocean blue `#0b2a44`, emergency orange `#f97316`) in a new stylesheet. Do not restyle `App.css` globally; theme the new site shell separately. Reuse `.status`, `.mission-card` patterns conceptually but create site-specific components.
7. **Dashboard data:** use real endpoints only — `/auth/me`, `/missions`, `/sessions/:id/progress` and a new aggregated player endpoint if needed. Never fabricate statistics or achievements; show empty states instead.
8. **Testing:** extend `tests/` with auth tests using the same `node:test` + real DB approach (registration, duplicate email, login, logout, `/me`, protected route). Keep all 21 existing tests green.

## 6. Risks / open issues found during inspection

- Nothing in the current API identifies the caller, so session endpoints are effectively public to anyone with a session id.
- Colyseus CORS allows `Authorization` (updated in Milestone 2); no further header change was needed for bearer tokens, and no cookies are used.
- No `helmet`, rate limiting, CSRF or cookie parser; login endpoints will need at least basic rate limiting consideration.
- Migration drift and `DIRECT_URL` documentation gap (see §4).
- Frontend has no router and no form/UI primitives; the website must be added without disturbing the canvas contract.
- Duplicate `.zone-toast` CSS rules and a single 600 px breakpoint in `App.css`.
- Unrelated working-tree changes from the previous bug-fix session are still uncommitted; keep them in a separate commit from this report.

## 7. Verification performed

- Read-only inspection of all listed files; no application code, schema, route, CSS or config was modified.
- Dependency versions checked against `package-lock.json` and `node_modules/`.
- Baseline verification from the preceding bug-fix work remains valid: client lint clean, client build succeeds, 21/21 server tests pass.

## 8. Next milestone (awaiting approval)

**Milestone 2 — Database model and backend authentication**: schema change + migration, bcrypt dependency, auth config/middleware/routes, `/me`, logout, protected route, and tests. No frontend work until Milestone 3.
