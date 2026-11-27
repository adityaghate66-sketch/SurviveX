// Password hashing and token signing primitives.
//
// bcrypt and jsonwebtoken are explicit dependencies (see package.json). Tokens
// carry a `jti` so logout can revoke one without invalidating every device.

import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "./env.js";

const ISSUER = "survivex";
const AUDIENCE = "survivex-web";

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.bcryptRounds);
}

export async function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}

export function signAccessToken(player) {
  return jwt.sign(
    { sub: player.id, username: player.username },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: ISSUER,
      audience: AUDIENCE,
      jwtid: randomUUID(),
    }
  );
}

/** Returns the verified payload, or throws if the token is invalid/expired. */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}
