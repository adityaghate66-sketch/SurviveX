// Authentication business logic: validation, credential checks and the safe
// player projection. Nothing here ever returns `passwordHash` to a caller.

import { AppError } from "../errors/AppError.js";
import { getPrisma, isDatabaseConfigured } from "../config/database.js";
import { hashPassword, verifyPassword } from "../config/auth.js";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new AppError("DATABASE_URL is not set. Add it to server/.env.", {
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
    });
  }
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function invalidInput(field, message, code = "INVALID_INPUT") {
  return new AppError(message, {
    statusCode: 400,
    code,
    details: { field },
  });
}

function invalidCredentials() {
  return new AppError("Invalid email or password.", {
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
  });
}

function alreadyTaken(field) {
  const isEmail = field === "email";
  return new AppError(
    isEmail ? "Email already registered." : "Username already taken.",
    {
      statusCode: 409,
      code: isEmail ? "EMAIL_TAKEN" : "USERNAME_TAKEN",
      details: { field },
    }
  );
}

function isUniqueViolation(error, column) {
  if (error?.code !== "P2002") return false;
  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(column);
  return typeof target === "string" && target.includes(column);
}

/** The only shape of a player that is ever sent over the API. */
function presentPlayer(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function registerPlayer(rawPayload) {
  requireDb();
  const payload = asObject(rawPayload);
  const username = asText(payload.username);
  const email = asText(payload.email).toLowerCase();
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!USERNAME_PATTERN.test(username)) {
    throw invalidInput(
      "username",
      "username must be 3-32 characters: letters, numbers, underscore or hyphen."
    );
  }
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw invalidInput("email", "A valid email address is required.");
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw invalidInput(
      "password",
      `password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`
    );
  }
  if (
    payload.confirmPassword !== undefined &&
    payload.confirmPassword !== password
  ) {
    throw invalidInput(
      "confirmPassword",
      "Passwords do not match.",
      "PASSWORD_MISMATCH"
    );
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing?.email === email) throw alreadyTaken("email");
  if (existing?.username === username) throw alreadyTaken("username");

  const passwordHash = await hashPassword(password);
  try {
    const user = await prisma.user.create({
      data: { username, email, passwordHash },
    });
    return presentPlayer(user);
  } catch (error) {
    // The pre-check is friendly; the unique index is the actual guarantee when
    // two registrations race.
    if (isUniqueViolation(error, "email")) throw alreadyTaken("email");
    if (isUniqueViolation(error, "username")) throw alreadyTaken("username");
    throw error;
  }
}

export async function authenticatePlayer(rawPayload) {
  requireDb();
  const payload = asObject(rawPayload);
  const email = asText(payload.email).toLowerCase();
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    throw invalidInput("email", "Email and password are required.");
  }

  const user = await getPrisma().user.findUnique({ where: { email } });
  // Guest users have no passwordHash and therefore cannot log in.
  if (!user?.passwordHash) throw invalidCredentials();

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) throw invalidCredentials();

  return presentPlayer(user);
}

export async function getPlayerById(id) {
  requireDb();
  if (!id) {
    throw new AppError("Player id is required.", {
      statusCode: 400,
      code: "INVALID_INPUT",
      details: { field: "id" },
    });
  }

  const user = await getPrisma().user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(`Player not found: ${id}`, {
      statusCode: 404,
      code: "PLAYER_NOT_FOUND",
    });
  }
  return presentPlayer(user);
}

/** Records a revoked token id until the token would have expired naturally. */
export async function revokeToken(jti, expiresAt) {
  requireDb();
  const prisma = getPrisma();
  // Housekeeping: a denylist entry is useless once its token has expired.
  await prisma.revokedToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  await prisma.revokedToken.upsert({
    where: { jti },
    update: { expiresAt },
    create: { jti, expiresAt },
  });
}
