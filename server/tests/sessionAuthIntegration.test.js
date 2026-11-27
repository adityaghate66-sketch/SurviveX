// Integration tests for optional auth on POST /api/sessions.
// Guest play must keep working exactly as before; a verified token binds the
// session to that player and overrides any client-supplied userId.

import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../src/app.js";
import {
  disconnectDatabase,
  getPrisma,
  isDatabaseConfigured,
} from "../src/config/database.js";

const PREFIX = `ts${Date.now().toString(36)}`;
const PASSWORD = "Sup3rSecret!";
const MISSION_CODE = "001";

let server;
let baseUrl;
const revokedJtis = [];

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

function startSession(payload, token) {
  return api("POST", "/sessions", { missionCode: MISSION_CODE, ...payload }, token);
}

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
    if (revokedJtis.length) {
      await getPrisma().revokedToken.deleteMany({
        where: { jti: { in: revokedJtis } },
      });
    }
    await getPrisma().user.deleteMany({
      where: { username: { startsWith: PREFIX } },
    });
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
});

test("a verified token binds the session to that player", async () => {
  const account = await createPlayer("owner");

  const created = await startSession(
    { username: username("owner") },
    account.token
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.data.authenticated, true);
  assert.equal(created.body.data.userId, account.player.id);
  assert.notEqual(created.body.data.sessionId, null);

  const reused = await startSession(
    { username: username("owner") },
    account.token
  );
  assert.equal(reused.status, 200);
  assert.equal(reused.body.data.reused, true);
  assert.equal(reused.body.data.sessionId, created.body.data.sessionId);
  assert.equal(reused.body.data.userId, account.player.id);
});

test("a verified token overrides a client-supplied userId", async () => {
  const account = await createPlayer("override");
  const other = await createPlayer("other");

  const created = await startSession(
    { userId: other.player.id, username: username("override") },
    account.token
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.data.userId, account.player.id);
  assert.equal(created.body.data.authenticated, true);
});

test("an unauthenticated userId cannot claim another player's session", async () => {
  const victim = await createPlayer("victim");

  const attack = await startSession({
    userId: victim.player.id,
    username: username("attacker"),
  });

  assert.equal(attack.status, 401);
  assert.equal(attack.body.error.code, "UNAUTHORIZED");

  const victimSessions = await getPrisma().gameSession.count({
    where: { userId: victim.player.id },
  });
  assert.equal(victimSessions, 0);
});

test("no token keeps the guest path unchanged", async () => {
  const created = await startSession({ username: username("guest") });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.authenticated, false);
  assert.ok(created.body.data.userId);

  const stored = await getPrisma().user.findUnique({
    where: { id: created.body.data.userId },
  });
  assert.equal(stored.username, username("guest"));
  assert.equal(stored.passwordHash, null);
});

test("invalid and revoked tokens fall back to guest play", async () => {
  const invalid = await startSession(
    { username: username("invalid") },
    "not.a.token"
  );
  assert.equal(invalid.status, 201);
  assert.equal(invalid.body.data.authenticated, false);

  const account = await createPlayer("revoked");
  const jti = jwt.decode(account.token)?.jti;
  if (jti) revokedJtis.push(jti);
  const signedOut = await api("POST", "/auth/logout", undefined, account.token);
  assert.equal(signedOut.status, 200);

  const afterLogout = await startSession(
    { username: username("revoked") },
    account.token
  );
  assert.equal(afterLogout.status, 201);
  assert.equal(afterLogout.body.data.authenticated, false);
});
