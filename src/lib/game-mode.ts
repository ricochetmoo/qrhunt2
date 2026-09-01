import { z } from "zod";

/**
 * How a game is won. Browser-safe: no server imports.
 *
 * - `speed`: the classic race — most stops found, fastest wins ties.
 * - `completeness`: encourages immersion over dashing — most stops (the
 *   wildcard counts too) wins, and time is deliberately ignored.
 */
export const GAME_MODES = ["speed", "completeness"] as const;

export const gameModeSchema = z.enum(GAME_MODES);

export type GameMode = z.infer<typeof gameModeSchema>;

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  speed: "Speed",
  completeness: "Completeness",
};

export const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  speed: "A race: most stops found wins, with the fastest team breaking ties.",
  completeness:
    "No rush: finding everything (wildcard included) is what counts — time doesn't affect the ranking.",
};

/** Player-facing one-liner shown when joining. */
export const GAME_MODE_PLAYER_BLURBS: Record<GameMode, string> = {
  speed: "It's a race — find the stops in order, fastest wins!",
  completeness: "No rush — take it in and find everything. Completeness wins, not speed.",
};

export function isGameMode(value: string): value is GameMode {
  return gameModeSchema.safeParse(value).success;
}
