// Boot-time configuration checks. Each case runs in a fresh Node process so
// dotenv and the module-level config are evaluated from scratch.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const serverDir = fileURLToPath(new URL("..", import.meta.url));

function loadConfig(overrides = {}) {
  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
        import { config } from './src/config/env.js';
        console.log(JSON.stringify({
          corsOrigins: config.corsOrigins,
          jwtExpiresIn: config.jwtExpiresIn,
        }));
      `,
    ],
    {
      cwd: serverDir,
      env: { ...process.env, ...overrides },
      encoding: "utf8",
    }
  );
}

test("production refuses to boot without JWT_SECRET", () => {
  const result = loadConfig({ NODE_ENV: "production", JWT_SECRET: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET must be set when NODE_ENV=production/);
});

test("invalid JWT_EXPIRES_IN fails at boot, not at login", () => {
  const result = loadConfig({ JWT_EXPIRES_IN: "tomorrow" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid JWT_EXPIRES_IN/);
});

test("CORS origins are trimmed and trailing slashes removed", () => {
  const result = loadConfig({
    CORS_ORIGIN: " https://app.example.com/ , https://admin.example.com/ ",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()).corsOrigins, [
    "https://app.example.com",
    "https://admin.example.com",
  ]);
});
