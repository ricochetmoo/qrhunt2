import "server-only";

import type { Context } from "hono";

export type DomainErrorCode = "NOT_FOUND" | "INVALID_TRANSITION" | "ROUTE_MISMATCH" | "VALIDATION";

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

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

const STATUS_BY_CODE: Record<DomainErrorCode, 400 | 404 | 409> = {
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  ROUTE_MISMATCH: 400,
  VALIDATION: 400,
};

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/** Map a DomainError to a JSON response; rethrow anything else. */
export function domainErrorToResponse(c: Context, error: unknown) {
  if (!isDomainError(error)) {
    throw error;
  }

  return c.json({ error: error.message, code: error.code }, STATUS_BY_CODE[error.code]);
}
