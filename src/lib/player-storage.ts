const ACTIVE_GAME_KEY = "qr-hunt:active-game";

type ActiveGame = {
  gameId: string;
  name: string;
};

function readActiveGame(): ActiveGame | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACTIVE_GAME_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ActiveGame>;

    if (
      typeof parsed.gameId !== "string" ||
      typeof parsed.name !== "string" ||
      !parsed.name.trim()
    ) {
      return null;
    }

    return { gameId: parsed.gameId, name: parsed.name };
  } catch {
    return null;
  }
}

/** Reads the last known name for this game without making it authoritative. */
export function readCachedGameName(gameId: string): string | null {
  const activeGame = readActiveGame();
  return activeGame?.gameId === gameId ? activeGame.name : null;
}

/** Stores only the small navigation marker; game state remains server-owned. */
export function rememberActiveGame(gameId: string, name: string) {
  if (typeof window === "undefined" || !name.trim()) return;

  try {
    window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({ gameId, name }));
  } catch {
    // Storage is a convenience only.
  }
}
