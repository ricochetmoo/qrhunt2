import "server-only";

import type { Context } from "hono";

/** Kept narrow so Hono RPC clients can discriminate success from error responses. */
export type DomainErrorStatus = 400 | 401 | 403 | 404 | 409 | 410;

export type DomainErrorCode =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "ROUTE_MISMATCH"
  | "VALIDATION"
  | "FORBIDDEN"
  | "CONFLICT"
  // Player flows
  | "GAME_UNAVAILABLE"
  | "GAME_NOT_JOINABLE"
  | "SELF_SIGNUP_DISABLED"
  | "ROUTE_SIGNUP_DISABLED"
  | "TEAM_CREATION_DISABLED"
  | "FEATURE_DISABLED"
  | "NOT_IN_GAME"
  | "NOT_IN_TEAM"
  | "ALREADY_IN_TEAM";

const STATUS_BY_CODE: Record<DomainErrorCode, DomainErrorStatus> = {
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  ROUTE_MISMATCH: 400,
  VALIDATION: 400,
  FORBIDDEN: 403,
  CONFLICT: 409,
  GAME_UNAVAILABLE: 404,
  GAME_NOT_JOINABLE: 409,
  SELF_SIGNUP_DISABLED: 403,
  ROUTE_SIGNUP_DISABLED: 403,
  TEAM_CREATION_DISABLED: 403,
  FEATURE_DISABLED: 403,
  NOT_IN_GAME: 403,
  NOT_IN_TEAM: 403,
  ALREADY_IN_TEAM: 409,
};

export class DomainError extends Error {
  readonly status: DomainErrorStatus;

  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    status?: DomainErrorStatus,
  ) {
    super(message);
    this.name = "DomainError";
    this.status = status ?? STATUS_BY_CODE[code];
  }
}

const UNIQUE_VIOLATION = "23505";

/** Postgres unique-constraint violation (error code 23505). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/** Map a DomainError to a JSON response; rethrow anything else. */
export function domainErrorToResponse(c: Context, error: unknown) {
  if (!isDomainError(error)) {
    throw error;
  }

  return c.json({ error: error.message, code: error.code }, error.status);
}
