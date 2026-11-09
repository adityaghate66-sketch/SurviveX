// Phase 1 tests for the session API and the zone rules.
//
// Run with `npm test` from server/. Uses only the Node built-ins (node:test,
// node:assert, global fetch), so no test framework had to be added.
//
// The suite starts the real Express app against the configured DATABASE_URL and
// talks to it over HTTP, which is the only way to prove routing, middleware,
// Prisma and Postgres all agree. Every user it creates is named test_* and is
// deleted again in the final hook (sessions and progress cascade), so the
// database is left as it was found.

import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/app.js";
import { disconnectDatabase, isDatabaseConfigured } from "../src/config/database.js";
import { getPrisma } from "../src/config/database.js";
import {
  ZONE_IDS,
  ZONE_PERCENT,
  MAX_PROGRESS,
  calculateProgress,
  isZoneId,
  normalizeZoneIds,
} from "../src/constants/zones.js";

const PREFIX = `test_${Date.now().toString(36)}`;
const MISSION_CODE = "001";

let server;
let baseUrl;

function username(suffix) {
  return `${PREFIX}_${suffix}`;
}

async function api(method, path, body, { raw = false } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: response.status, body: json, text, headers: response.headers };
}

const createSession = (name) => api("POST", "/sessions", { username: name, missionCode: MISSION_CODE });
const getProgress = (id) => api("GET", `/sessions/${id}/progress`);
const putZone = (id, zoneId) => api("PUT", `/sessions/${id}/progress`, { zoneId });
const complete = (id) => api("POST", `/sessions/${id}/complete`);

test.before(async () => {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not set; these tests need a real database.");
  }

  const app = createApp();
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(async () => {
  // Remove only what this run created. GameSession and MissionProgress are
  // deleted by the database through ON DELETE CASCADE.
  if (isDatabaseConfigured()) {
    await getPrisma().user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
});

// ---------------------------------------------------------------------------
// Zone contract — pure functions, no database needed.
// ---------------------------------------------------------------------------

test("zone config: exactly five unique zones worth 20% each", () => {
  assert.equal(ZONE_IDS.length, 5);
  assert.equal(new Set(ZONE_IDS).size, 5, "zone IDs must be unique");
  assert.equal(ZONE_PERCENT, 20);
  assert.equal(ZONE_PERCENT * ZONE_IDS.length, MAX_PROGRESS);

  assert.deepEqual(ZONE_IDS, [
    "teacher-desk",
    "student-desks",
    "windows",
    "classroom-entrance",
    "open-safe-area",
  ]);
});

test("zone config: progress is derived from the zone set, capped at 100", () => {
  assert.equal(calculateProgress([]), 0);
  assert.equal(calculateProgress(["teacher-desk"]), 20);
  assert.equal(calculateProgress(ZONE_IDS.slice(0, 3)), 60);
  assert.equal(calculateProgress(ZONE_IDS), 100);

  // Duplicates and unknown IDs must never add points.
  assert.equal(calculateProgress(["windows", "windows", "windows"]), 20);
  assert.equal(calculateProgress(["windows", "rooftop"]), 20);

  // Even a corrupted list cannot exceed the maximum.
  const duplicated = Array.from({ length: 20 }, () => ZONE_IDS[0]);
  assert.equal(calculateProgress(duplicated), 20);
  assert.ok(calculateProgress([...ZONE_IDS, ...ZONE_IDS]) <= MAX_PROGRESS);
});

test("zone config: normalization keeps canonical order and drops junk", () => {
  assert.deepEqual(normalizeZoneIds(["windows", "teacher-desk", "windows"]), [
    "teacher-desk",
    "windows",
  ]);
  assert.deepEqual(normalizeZoneIds(null), []);
  assert.deepEqual(normalizeZoneIds("windows"), []);
  assert.deepEqual(normalizeZoneIds([1, null, {}, "windows"]), ["windows"]);
});

test("zone config: isZoneId rejects everything that is not a known ID", () => {
  for (const id of ZONE_IDS) assert.equal(isZoneId(id), true);
  for (const bad of ["rooftop", "", "WINDOWS", 42, null, undefined, {}, ["windows"]]) {
    assert.equal(isZoneId(bad), false, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

// ---------------------------------------------------------------------------
// POST /api/sessions
// ---------------------------------------------------------------------------

test("POST /sessions creates a fresh active session at 0%", async () => {
  const { status, body } = await createSession(username("create"));

  assert.equal(status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.reused, false);
  assert.equal(body.data.progress, 0);
  assert.deepEqual(body.data.visitedZones, []);
  assert.equal(body.data.status, "ACTIVE");
  assert.equal(body.data.completedAt, null);
  assert.equal(body.data.mission.code, MISSION_CODE);
  assert.match(body.data.sessionId, /^[a-z0-9]{20,}$/);
});

test("POST /sessions reuses the existing active session", async () => {
  const name = username("reuse");
  const first = await createSession(name);
  const second = await createSession(name);

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.body.data.reused, true);
  assert.equal(second.body.data.sessionId, first.body.data.sessionId);
});

test("POST /sessions defaults to the guest account", async () => {
  // The guest account is shared with real browsers, so it may already have an
  // active session: 201 when created, 200 when reused. Both are correct.
  const { status, body } = await api("POST", "/sessions", { missionCode: MISSION_CODE });

  assert.ok([200, 201].includes(status), `unexpected status ${status}`);
  assert.equal(body.data.reused, status === 200);
  assert.equal(body.data.status, "ACTIVE");
  assert.ok(body.data.progress >= 0 && body.data.progress <= 100);
  assert.match(body.data.sessionId, /^[a-z0-9]{20,}$/);
});

// ---------------------------------------------------------------------------
// GET /api/sessions/:sessionId/progress
// ---------------------------------------------------------------------------

test("GET /sessions/:id/progress returns the stored state", async () => {
  const created = await createSession(username("read"));
  const { status, body } = await getProgress(created.body.data.sessionId);

  assert.equal(status, 200);
  assert.equal(body.data.progress, 0);
  assert.deepEqual(body.data.visitedZones, []);
  assert.equal(body.data.status, "ACTIVE");
});

// ---------------------------------------------------------------------------
// PUT /api/sessions/:sessionId/progress
// ---------------------------------------------------------------------------

test("PUT /sessions/:id/progress adds a zone once and ignores duplicates", async () => {
  const { body: created } = await createSession(username("dup"));
  const id = created.data.sessionId;

  const first = await putZone(id, "teacher-desk");
  assert.equal(first.status, 200);
  assert.equal(first.body.data.progress, 20);
  assert.equal(first.body.data.newlyDiscovered, true);
  assert.equal(first.body.data.completed, false);

  const again = await putZone(id, "teacher-desk");
  assert.equal(again.status, 200);
  assert.equal(again.body.data.progress, 20, "a duplicate zone must not add progress");
  assert.equal(again.body.data.newlyDiscovered, false);
  assert.equal(again.body.data.visitedZones.length, 1);
});

test("PUT /sessions/:id/progress rejects unknown zones and lists the valid ones", async () => {
  const { body: created } = await createSession(username("badzone"));
  const { status, body } = await putZone(created.data.sessionId, "rooftop");

  assert.equal(status, 400);
  assert.equal(body.success, false);
  assert.equal(body.error.code, "INVALID_ZONE");
  assert.deepEqual(body.error.details.allowedZones, ZONE_IDS);
});

test("PUT /sessions/:id/progress reaches exactly 100% at five zones", async () => {
  const { body: created } = await createSession(username("walk"));
  const id = created.data.sessionId;

  const seen = [];
  for (const zoneId of ZONE_IDS) {
    const { status, body } = await putZone(id, zoneId);
    assert.equal(status, 200);
    seen.push(body.data.progress);
  }

  assert.deepEqual(seen, [20, 40, 60, 80, 100]);
  assert.equal(calculateProgress(seen.map((_, index) => ZONE_IDS[index])), 100);
});

// ---------------------------------------------------------------------------
// POST /api/sessions/:sessionId/complete
// ---------------------------------------------------------------------------

test("POST /sessions/:id/complete refuses an incomplete mission", async () => {
  const { body: created } = await createSession(username("early"));
  const id = created.data.sessionId;

  await putZone(id, "teacher-desk");
  const { status, body } = await complete(id);

  assert.equal(status, 409);
  assert.equal(body.error.code, "MISSION_INCOMPLETE");
  assert.equal(body.error.details.discovered, 1);
  assert.equal(body.error.details.remainingZones.length, 4);
});

test("POST /sessions/:id/complete marks the session completed, then is idempotent", async () => {
  const { body: created } = await createSession(username("finish"));
  const id = created.data.sessionId;

  for (const zoneId of ZONE_IDS) await putZone(id, zoneId);

  const first = await complete(id);
  assert.equal(first.status, 200);
  assert.equal(first.body.data.status, "COMPLETED");
  assert.equal(first.body.data.alreadyCompleted, false);
  assert.equal(first.body.data.progress, 100);
  assert.ok(first.body.data.completedAt);

  const second = await complete(id);
  assert.equal(second.status, 200);
  assert.equal(second.body.data.alreadyCompleted, true);
  assert.equal(second.body.data.completedAt, first.body.data.completedAt);
});

test("completed sessions are read-only and a new session can be started", async () => {
  const name = username("readonly");
  const { body: created } = await createSession(name);
  const id = created.data.sessionId;

  for (const zoneId of ZONE_IDS) await putZone(id, zoneId);
  await complete(id);

  const late = await putZone(id, "teacher-desk");
  assert.equal(late.status, 200);
  assert.equal(late.body.data.progress, 100);
  assert.equal(late.body.data.visitedZones.length, 5);

  const stored = await getProgress(id);
  assert.equal(stored.body.data.status, "COMPLETED");
  assert.equal(stored.body.data.progress, 100);

  const fresh = await createSession(name);
  assert.equal(fresh.status, 201);
  assert.notEqual(fresh.body.data.sessionId, id);
  assert.equal(fresh.body.data.progress, 0);
});

// ---------------------------------------------------------------------------
// Failure handling
// ---------------------------------------------------------------------------

test("unknown sessions return 404 SESSION_NOT_FOUND", async () => {
  for (const response of [
    await getProgress("cmnotarealsession000000"),
    await putZone("cmnotarealsession000000", "windows"),
    await complete("cmnotarealsession000000"),
  ]) {
    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, "SESSION_NOT_FOUND");
  }
});

test("invalid session creation payloads are rejected", async () => {
  const short = await api("POST", "/sessions", { username: "ab", missionCode: MISSION_CODE });
  assert.equal(short.status, 400);
  assert.equal(short.body.error.code, "INVALID_USERNAME");

  const noMission = await api("POST", "/sessions", { username: username("nomission") });
  assert.equal(noMission.status, 400);
  assert.equal(noMission.body.error.code, "MISSION_REQUIRED");

  const unknownMission = await api("POST", "/sessions", {
    username: username("unknownmission"),
    missionCode: "does-not-exist",
  });
  assert.equal(unknownMission.status, 404);
  assert.equal(unknownMission.body.error.code, "MISSION_NOT_FOUND");
});

test("progress updates validate their payload", async () => {
  const { body: created } = await createSession(username("payload"));
  const id = created.data.sessionId;

  const missing = await api("PUT", `/sessions/${id}/progress`, {});
  assert.equal(missing.status, 400);
  assert.equal(missing.body.error.code, "INVALID_ZONE");

  const empty = await api("PUT", `/sessions/${id}/progress`, { zoneId: "  " });
  assert.equal(empty.status, 400);

  const malformed = await api("PUT", `/sessions/${id}/progress`, "{not json", { raw: true });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error.code, "INVALID_JSON");

  // A rejected request must not have touched the session.
  const after = await getProgress(id);
  assert.equal(after.body.data.progress, 0);
});

test("CORS allows a browser origin with no trailing slash and blocks others", async () => {
  const allowed = await fetch(`${baseUrl}/health`, {
    headers: { Origin: "https://survive-x-dusky.vercel.app" },
  });
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "https://survive-x-dusky.vercel.app"
  );

  const blocked = await fetch(`${baseUrl}/health`, {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);

  const preflight = await fetch(`${baseUrl}/sessions/x/progress`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://survive-x-dusky.vercel.app",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert.ok(preflight.status === 204 || preflight.status === 200);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "https://survive-x-dusky.vercel.app"
  );
});

// ---------------------------------------------------------------------------
// Concurrency — the advisory locks must hold under parallel requests.
// ---------------------------------------------------------------------------

test("parallel session creation yields a single session", async () => {
  const name = username("race");
  const responses = await Promise.all(
    Array.from({ length: 5 }, () => createSession(name))
  );

  const codes = responses.map((r) => r.status).sort();
  assert.deepEqual(codes, [200, 200, 200, 200, 201], "exactly one request creates the session");

  const ids = new Set(responses.map((r) => r.body.data.sessionId));
  assert.equal(ids.size, 1);
});

test("parallel completion requests are safe", async () => {
  const { body: created } = await createSession(username("doublecomplete"));
  const id = created.data.sessionId;

  for (const zoneId of ZONE_IDS) await putZone(id, zoneId);

  // A double click sends several completion requests at once.
  const responses = await Promise.all([complete(id), complete(id), complete(id)]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "COMPLETED");
    assert.equal(response.body.data.progress, 100);
  }

  const { body } = await getProgress(id);
  assert.equal(body.data.status, "COMPLETED");
  assert.equal(body.data.progress, 100);
});

test("parallel zone updates lose no progress", async () => {
  const { body: created } = await createSession(username("parallel"));
  const id = created.data.sessionId;

  const responses = await Promise.all(ZONE_IDS.map((zoneId) => putZone(id, zoneId)));
  for (const response of responses) assert.equal(response.status, 200);

  const { body } = await getProgress(id);
  assert.equal(body.data.progress, 100);
  assert.equal(body.data.visitedZones.length, 5);
  assert.equal(new Set(body.data.visitedZones).size, 5);
});
