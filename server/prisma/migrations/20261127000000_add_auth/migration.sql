-- Auth fields on the existing User model. Both are nullable so guest players
-- created from a browser username keep working unchanged.
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- PostgreSQL allows multiple NULLs in a unique index, so guests remain valid.
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Server-side logout denylist for JWTs.
CREATE TABLE "RevokedToken" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("jti")
);

CREATE INDEX "RevokedToken_expiresAt_idx" ON "RevokedToken"("expiresAt");
