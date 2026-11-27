// Authentication API tests. Same approach as sessionApi.test.js: real Express
// app on an ephemeral port, real PostgreSQL, Node's built-in test runner.

import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { createApp } from "../src/app.js";
import {
  disconnectDatabase,
  getPrisma,
  isDatabaseConfigured,
} from "../src/config/database.js";

const PREFIX = `ta${Date.now().toString(36)}`; // short enough for the username rule
const PASSWORD = "Sup3rSecret!";

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
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

function register(suffix, overrides = {}) {
  return api("POST", "/auth/register", {
    username: username(suffix),
    email: email(suffix),
    password: PASSWORD,
    confirmPassword: PASSWORD,
    ...overrides,
  });
}

function login(suffix, password = PASSWORD) {
  return api("POST", "/auth/login", {
    email: email(suffix),
    password,
  });
}

const me = (token) => api("GET", "/auth/me", undefined, token);
const logout = (token) => api("POST", "/auth/logout", undefined, token);

function rememberJti(token) {
  const jti = jwt.decode(token)?.jti;
  if (jti) revokedJtis.push(jti);
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
  const prisma = isDatabaseConfigured() ? getPrisma() : null;
  if (prisma) {
    if (revokedJtis.length) {
      await prisma.revokedToken.deleteMany({ where: { jti: { in: revokedJtis } } });
    }
    await prisma.user.deleteMany({ where: { username: { startsWith: PREFIX } } });
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase();
});

test("register creates a player and never returns a password hash", async () => {
  const response = await register("ok");
  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);

  const player = response.body.data;
  assert.equal(player.username, username("ok"));
  assert.equal(player.email, email("ok"));
  assert.ok(player.id);
  assert.ok(!("passwordHash" in player));
  assert.ok(!("password" in player));

  const stored = await getPrisma().user.findUnique({ where: { id: player.id } });
  assert.ok(stored.passwordHash);
  assert.notEqual(stored.passwordHash, PASSWORD);
  assert.notEqual(stored.passwordHash, "");
});

test("duplicate email and username are rejected", async () => {
  await register("dupe");

  const sameEmail = await register("dupe2", { email: email("dupe") });
  assert.equal(sameEmail.status, 409);
  assert.equal(sameEmail.body.error.code, "EMAIL_TAKEN");

  const sameUsername = await register("dupe", { email: email("dupe3") });
  assert.equal(sameUsername.status, 409);
  assert.equal(sameUsername.body.error.code, "USERNAME_TAKEN");
});

test("registration validates its input", async () => {
  const shortPassword = await register("short", {
    password: "abc",
    confirmPassword: "abc",
  });
  assert.equal(shortPassword.status, 400);
  assert.equal(shortPassword.body.error.code, "INVALID_INPUT");

  const badEmail = await register("bademail", { email: "not-an-email" });
  assert.equal(badEmail.status, 400);

  const mismatch = await register("mismatch", { confirmPassword: "Different1!" });
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.body.error.code, "PASSWORD_MISMATCH");
});

test("login returns a bearer token and a safe player", async () => {
  await register("login");

  const response = await login("login");
  assert.equal(response.status, 200);
  assert.equal(response.body.data.tokenType, "Bearer");
  assert.equal(typeof response.body.data.token, "string");
  assert.equal(response.body.data.player.email, email("login"));
  assert.ok(!("passwordHash" in response.body.data.player));
});

test("wrong passwords and unknown accounts cannot log in", async () => {
  await register("wrongpw");

  const wrongPassword = await login("wrongpw", "NotThePassword1!");
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.error.code, "INVALID_CREDENTIALS");

  const unknown = await api("POST", "/auth/login", {
    email: email("nobody"),
    password: PASSWORD,
  });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.error.code, "INVALID_CREDENTIALS");
});

test("a user without a password hash cannot log in", async () => {
  await getPrisma().user.create({
    data: { username: username("guest"), email: email("guest") },
  });

  const response = await login("guest");
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "INVALID_CREDENTIALS");
});

test("protected /me requires a valid token", async () => {
  await register("me");
  const { body } = await login("me");
  const token = body.data.token;

  const missing = await me();
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error.code, "UNAUTHORIZED");

  const invalid = await me("not.a.token");
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error.code, "INVALID_TOKEN");

  const valid = await me(token);
  assert.equal(valid.status, 200);
  assert.equal(valid.body.data.email, email("me"));
  assert.ok(!("passwordHash" in valid.body.data));
});

test("logout revokes the token server-side", async () => {
  await register("logout");
  const { body } = await login("logout");
  const token = body.data.token;
  rememberJti(token);

  const before = await me(token);
  assert.equal(before.status, 200);

  const signedOut = await logout(token);
  assert.equal(signedOut.status, 200);
  assert.equal(signedOut.body.data.loggedOut, true);

  const after = await me(token);
  assert.equal(after.status, 401);
  assert.equal(after.body.error.code, "TOKEN_REVOKED");
});
