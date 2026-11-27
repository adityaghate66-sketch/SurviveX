// Optional bearer authentication for endpoints that must keep working for
// guests (POST /api/sessions).
//
// A valid token attaches the safe player to `req.user`; no token, an expired
// token or a revoked token simply continues without one. Protected routes keep
// using requireAuth, which rejects those cases.

import { getPrisma, isDatabaseConfigured } from "../config/database.js";
import { verifyAccessToken } from "../config/auth.js";

export async function optionalAuth(req, _res, next) {
  const header = req.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return next();

  try {
    if (!isDatabaseConfigured()) return next();

    const payload = verifyAccessToken(match[1]);
    if (!payload.sub || !payload.jti) return next();

    const prisma = getPrisma();
    const revoked = await prisma.revokedToken.findUnique({
      where: { jti: payload.jti },
    });
    if (revoked) return next();

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (user) {
      req.user = user;
      req.auth = {
        jti: payload.jti,
        expiresAt: new Date(payload.exp * 1000),
      };
    }
  } catch {
    // Invalid/expired token behaves like no token: guest play continues.
  }

  return next();
}
