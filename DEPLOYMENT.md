# SurviveX deployment checklist

## 1. Deploy the backend first

Set these on the API host:

```text
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://your-frontend.example.com
JWT_SECRET=<long random value, e.g. openssl rand -hex 32>
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

`DIRECT_URL` is only needed for Prisma CLI commands such as migrations.

Before starting the API:

```bash
cd server
npm install
npm run db:generate
npm run db:migrate:deploy
npm run db:seed   # only on a fresh database
npm test
npm start
```

The server refuses to boot in production without `JWT_SECRET`, and invalid
`JWT_EXPIRES_IN` / `BCRYPT_ROUNDS` values fail at boot rather than at login.

## 2. Build the frontend against that API

In `client/.env` (or your static host’s build env):

```text
VITE_API_BASE_URL=https://your-api.example.com/api
```

The `/api` suffix is required. Vite bakes this value into the build, so rebuild
after changing it. For local development, leave it empty and let the Vite proxy
send `/api` to `VITE_API_TARGET` (`http://localhost:4000` by default).

```bash
cd client
npm install
npm run lint
npm run build
```

## 3. SPA fallback is required

The site uses browser routes: `/welcome`, `/login`, `/signup`,
`/forgot-password`, `/dashboard`, `/profile` and `/settings`. A direct visit or
refresh to any of these must serve `index.html`.

Included configs:

- Netlify with base directory `client`: `client/public/_redirects`
- Vercel with project root `client`: `client/vercel.json`

For any other static host, rewrite all non-file requests to `/index.html` while
still serving `/assets/*` normally.

## 4. Smoke test after deploy

Open each URL directly, not only by clicking links:

```text
/
/welcome
/login
/signup
/forgot-password
/dashboard   (redirects to /login when signed out)
/profile     (redirects to /login when signed out)
/settings    (redirects to /login when signed out)
```

Then verify the full auth flow:

1. Sign up → lands on `/dashboard`
2. Sign out → token is revoked server-side
3. Sign in → lands on `/dashboard`
4. Enter World → game loads with the signed-in identity
5. Guest play from a signed-out tab still works

## 5. Rollout order

Always deploy **backend first**. The older frontend still works against the new
API because guest routes are unchanged. Deploy the frontend second so it can
rely on the new `authenticated` / `userId` fields and the SPA fallback.
