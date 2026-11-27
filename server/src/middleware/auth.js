// Bearer-token authentication for protected routes.
//
// The token is verified locally (signature, issuer, audience, expiry), then the
// jti is checked against the logout denylist and the player is loaded from the
// database. Only the safe player projection is attached to `req.user`.

import { AppError } from "../errors/AppError.js";
import { getPrisma, isDatabaseConfigured } from "../config/database.js";
import { verifyAccessToken } from "../config/auth.js";

function unauthorized(code, message) {
  return new AppError(message, { statusCode: 401, code });
}

export async function requireAuth(req, _res, next) {
  try {
    const header = req.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (!match) throw unauthorized("UNAUTHORIZED", "Authentication required.");

    let payload;
    try {
      payload = verifyAccessToken(match[1]);
    } catch {
      throw unauthorized("INVALID_TOKEN", "Invalid or expired token.");
    }

    if (!payload.sub || !payload.jti) {
      throw unauthorized("INVALID_TOKEN", "Invalid or expired token.");
    }

    if (!isDatabaseConfigured()) {
      throw new AppError("DATABASE_URL is not set. Add it to server/.env.", {
        statusCode: 503,
        code: "DATABASE_UNAVAILABLE",
      });
    }

    const prisma = getPrisma();
    const revoked = await prisma.revokedToken.findUnique({
      where: { jti: payload.jti },
    });
    if (revoked) {
      throw unauthorized("TOKEN_REVOKED", "This session has ended. Sign in again.");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthorized("UNAUTHORIZED", "Authentication required.");

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    req.auth = {
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    };
    next();
  } catch (error) {
    next(error);
  }
}
