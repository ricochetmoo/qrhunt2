import { z } from "zod";

/**
 * Game lifecycle states. Browser-safe: no server imports here.
 * The DB column is plain text; validity is enforced at the API boundary.
 */
export const GAME_STATUSES = [
  "draft",
  "published",
  "started",
  "paused",
  "finished",
  "archived",
] as const;

export const gameStatusSchema = z.enum(GAME_STATUSES);

export type GameStatus = z.infer<typeof gameStatusSchema>;

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  draft: "Draft",
  published: "Published",
  started: "Started",
  paused: "Paused",
  finished: "Finished",
  archived: "Archived",
};

export function isGameStatus(value: string): value is GameStatus {
  return gameStatusSchema.safeParse(value).success;
}

// --- Player-facing rules derived from the lifecycle (AGENTS.md "Game lifecycle").

/** Players can see the game (everything except draft and archived). */
export function isPlayerVisible(status: string): boolean {
  return status === "published" || status === "started" || status === "paused" || status === "finished";
}

/** Players can join the game and form teams. */
export function isJoinable(status: string): boolean {
  return status === "published" || status === "started" || status === "paused";
}

/** The game has begun, so hints are released (even while paused or after finishing). */
export function hasStarted(status: string): boolean {
  return status === "started" || status === "paused" || status === "finished";
}

/** Scans are accepted right now. */
export function canScan(status: string): boolean {
  return status === "started";
}
