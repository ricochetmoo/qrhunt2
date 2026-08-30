/**
 * Extract a human-readable message from a failed API response. Handles the
 * `{ error }` shape used by the admin routes and the `{ success: false, error:
 * { issues } }` shape returned by `@hono/zod-validator`.
 */
export async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status}).`;

  try {
    const body: unknown = await response.json();

    if (typeof body !== "object" || body === null) {
      return fallback;
    }

    const { error } = body as { error?: unknown };

    if (typeof error === "string") {
      return error;
    }

    if (typeof error === "object" && error !== null) {
      const issues = extractIssues(error as { issues?: unknown; message?: unknown });

      if (issues.length > 0) {
        return issues
          .map((issue) => {
            const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
            return path ? `${path}: ${issue.message}` : (issue.message ?? "Invalid input.");
          })
          .join(" ");
      }
    }
  } catch {
    // Non-JSON body; fall through.
  }

  return fallback;
}

type Issue = { path?: unknown[]; message?: string };

/**
 * Zod 4's `ZodError` serializes to `{ name, message }` where `message` is the
 * JSON-encoded issue list; older shapes expose `issues` directly.
 */
function extractIssues(error: { issues?: unknown; message?: unknown }): Issue[] {
  if (Array.isArray(error.issues)) {
    return error.issues as Issue[];
  }

  if (typeof error.message === "string") {
    try {
      const parsed: unknown = JSON.parse(error.message);
      return Array.isArray(parsed) ? (parsed as Issue[]) : [];
    } catch {
      return [];
    }
  }

  return [];
}
