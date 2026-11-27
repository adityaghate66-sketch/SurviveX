// Dashboard summary tests. Real Express app, real PostgreSQL, node:test.
// Session rows are seeded directly with Prisma rather than through the
// lock-heavy session API so this file does not contend with the parallel
// concurrency tests in sessionApi.test.js when the whole suite runs at once.

import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/app.js";
import {
  disconnectDatabase,
  getPrisma,
  isDatabaseConfigured,
} from "../src/config/database.js";
import { calculateProgress, ZONE_IDS } from "../src/constants/zones.js";

const PREFIX = `tp${Date.now().toString(36)}`;
const PASSWORD = "Sup3rSecret!";
const MISSION_CODE = "001";

let server;
let baseUrl;

function username(suffix) {
  return `${PREFIX}_${suffix}`;
}

function email(suffix) {
  return `${PREFIX}_${suffix}@example.test`;
}

async function api(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function createPlayer(suffix) {
  const registered = await api("POST", "/auth/register", {
    username: username(suffix),
    email: email(suffix),
    password: PASSWORD,
    confirmPassword: PASSWORD,
  });
  assert.equal(registered.status, 201);

  const loggedIn = await api("POST", "/auth/login", {
    email: email(suffix),
    password: PASSWORD,
  });
  assert.equal(loggedIn.status, 200);

  return { player: registered.body.data, token: loggedIn.body.data.token };
}

async function seedSession(userId, missionId, status, zones) {
  const completedAt = status === "COMPLETED" ? new Date() : null;
  const session = await getPrisma().gameSession.create({
    data: {
      userId,
      missionId,
      status,
      completedAt,
      progress: {
        create: {
          progress: calculateProgress(zones),
          visitedZones: zones,
        },
      },
    },
  });
  return session;
}

const summary = (token) => api("GET", "/player/summary", undefined, token);

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
  if (isDatabaseConfigured()) {
    await getPrisma().user.deleteMany({
      where: { username: { startsWith: PREFIX } },
    });
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
});

test("summary requires authentication", async () => {
  const missing = await summary();
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error.code, "UNAUTHORIZED");

  const invalid = await summary("not.a.token");
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error.code, "INVALID_TOKEN");
});

test("summary reflects real sessions and never exposes a password hash", async () => {
  const { player, token } = await createPlayer("stats");
  const mission = await getPrisma().mission.findFirst({
    where: { code: MISSION_CODE },
  });
  assert.ok(mission, "the seeded mission is required for this test");

  const session = await seedSession(player.id, mission.id, "COMPLETED", ZONE_IDS);

  const response = await summary(token);
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const data = response.body.data;
  assert.equal(data.player.username, username("stats"));
  assert.equal(data.player.id, player.id);
  assert.ok(!JSON.stringify(data).includes("passwordHash"));

  assert.deepEqual(data.stats, {
    totalSessions: 1,
    completedSessions: 1,
    activeSessions: 0,
    abandonedSessions: 0,
    missionsCompleted: 1,
    zonesDiscovered: ZONE_IDS.length,
  });

  assert.equal(data.recentActivity.length, 1);
  assert.equal(data.recentActivity[0].sessionId, session.id);
  assert.equal(data.recentActivity[0].status, "COMPLETED");
  assert.equal(data.recentActivity[0].progress, 100);
  assert.equal(data.recentActivity[0].mission.code, MISSION_CODE);
  assert.equal(data.recentActivity[0].zonesDiscovered, ZONE_IDS.length);

  assert.deepEqual(data.achievements, []);
});

test("summary is scoped to the signed-in player", async () => {
  const first = await createPlayer("first");
  const second = await createPlayer("second");
  const mission = await getPrisma().mission.findFirst({
    where: { code: MISSION_CODE },
  });
  assert.ok(mission, "the seeded mission is required for this test");

  await seedSession(first.player.id, mission.id, "ACTIVE", []);

  const secondSummary = await summary(second.token);
  assert.equal(secondSummary.status, 200);
  assert.equal(secondSummary.body.data.stats.totalSessions, 0);
  assert.equal(secondSummary.body.data.recentActivity.length, 0);
  assert.equal(secondSummary.body.data.player.id, second.player.id);
});
