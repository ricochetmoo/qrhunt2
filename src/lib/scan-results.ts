/**
 * Authoritative scan outcomes returned by `POST /api/player/games/:gameId/scans/sync`.
 * Browser-safe. The offline queue should drop a scan once it has a non-retryable
 * result and resend retryable ones later.
 */
export const SCAN_RESULTS = [
  "accepted", // next code in route order; progress advanced
  "wildcard", // the wildcard object; credited once per team
  "duplicate", // this team has already been credited for the code
  "out_of_order", // a real code, but not the next one on the route
  "invalid", // not a code in this game (or a disabled wildcard)
  "paused", // game is paused; resend when it resumes
  "not_started", // game (or this team, if staggered) has not started; resend later
  "late", // game already finished; recorded but not counted
] as const;

export type ScanResult = (typeof SCAN_RESULTS)[number];

/** Results that are not final: the client should keep the scan queued and retry. */
export const RETRYABLE_SCAN_RESULTS: ReadonlySet<ScanResult> = new Set(["paused", "not_started"]);

/** Results that are persisted server-side (and therefore idempotent by clientScanId). */
export const PERSISTED_SCAN_RESULTS: ReadonlySet<ScanResult> = new Set([
  "accepted",
  "wildcard",
  "duplicate",
  "out_of_order",
  "late",
]);

/** Results that credit the team (count towards progress / the leaderboard). */
export const CREDITED_SCAN_RESULTS = ["accepted", "wildcard"] as const;

export const SCAN_RESULT_MESSAGES: Record<ScanResult, string> = {
  accepted: "Code accepted — here is your next hint.",
  wildcard: "You found the wildcard!",
  duplicate: "Your team has already scanned this code.",
  out_of_order: "That code is on the route, but it isn't the next one. Follow your current hint.",
  invalid: "That code isn't part of this game.",
  paused: "The game is paused. Your scan will be sent when it resumes.",
  not_started: "The game hasn't started yet. Your scan will be sent when it does.",
  late: "The game has finished, so this scan doesn't count.",
};

export function isRetryableScanResult(result: ScanResult): boolean {
  return RETRYABLE_SCAN_RESULTS.has(result);
}
