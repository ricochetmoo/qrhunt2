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
