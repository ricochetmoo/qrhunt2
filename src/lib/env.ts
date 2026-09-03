import { z } from "zod";

const databaseUrlSchema = z
  .string()
  .min(1, "DATABASE_URL is required.")
  .url("DATABASE_URL must be a valid Neon Postgres connection string.");

const authSecretSchema = z
  .string()
  .min(32, "BETTER_AUTH_SECRET must be at least 32 characters long.");

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  // Better Auth inspects the adapter while Next.js collects route metadata
  // during a production build. No query is made at that stage, so a valid
  // placeholder keeps builds independent of deployment secrets. Runtime
  // requests still fail fast with the Zod error below when the env is missing.
  if (databaseUrl === undefined && process.env.NEXT_PHASE === "phase-production-build") {
    return "postgresql://build:build@localhost:5432/build";
  }

  return databaseUrlSchema.parse(databaseUrl);
}

export function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (secret === undefined && process.env.NEXT_PHASE === "phase-production-build") {
    return "build-only-secret-do-not-use-in-runtime-123456789";
  }

  return secret === undefined ? undefined : authSecretSchema.parse(secret);
}

export function getAdminAuthSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;

  if (secret === undefined && process.env.NEXT_PHASE === "phase-production-build") {
    return "build-only-secret-do-not-use-in-runtime-123456789";
  }

  return secret === undefined ? undefined : authSecretSchema.parse(secret);
}
