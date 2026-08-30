import "server-only";

import type { Game, QrCode } from "@/db/types";
import { encryptHint, hashRouteCode, type EncryptedHint } from "@/lib/hint-crypto";

/**
 * The offline route bundle handed to players. Never contains a code: each
 * entry carries a code hash (to classify scans offline) and either a plaintext
 * hint (already unlocked) or one encrypted with the previous code on the
 * route. See `src/lib/hint-crypto.ts` for the rationale.
 */
export type RouteBundleEntry = {
  id: string;
  position: number; // 0-based index on the ordered route
  name: string;
  location: { latitude: string; longitude: string } | null;
  codeHash: string;
  found: boolean;
  /** Plaintext when unlocked (found, or the current target once the game has started). */
  hint: string | null;
  /** Encrypted with the previous position's code; null for position 0 or when `hint` is set. */
  lockedHint: EncryptedHint | null;
};

export type RouteBundle = {
  /** Changes whenever the route is edited; clients should refetch when it differs. */
  version: string;
  totalCodes: number;
  codes: RouteBundleEntry[];
  wildcard: { id: string; name: string; codeHash: string; hint: string | null } | null;
};

/** Ordered route codes (wildcard excluded) and the wildcard, from a game's codes. */
export function splitRoute(codes: QrCode[]): { route: QrCode[]; wildcard: QrCode | null } {
  const route = codes
    .filter((code) => !code.isWildcard)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
  const wildcard = codes.find((code) => code.isWildcard) ?? null;

  return { route, wildcard };
}

export async function computeRouteVersion(codes: QrCode[]): Promise<string> {
  const fingerprint = codes
    .map((code) => `${code.id}:${code.sortOrder}:${code.isWildcard ? 1 : 0}:${code.updatedAt.getTime()}`)
    .sort()
    .join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));

  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildRouteBundle(
  game: Game,
  route: QrCode[],
  wildcard: QrCode | null,
  options: {
    foundIds: ReadonlySet<string>;
    targetIndex: number | null;
    /** Hints have been released to this team (game started; team released if staggered). */
    hintsReleased: boolean;
  },
): Promise<RouteBundle> {
  const entries = await Promise.all(
    route.map(async (code, index): Promise<RouteBundleEntry> => {
      const found = options.foundIds.has(code.id);
      const unlocked = options.hintsReleased && (found || index === options.targetIndex);
      const previous = index > 0 ? route[index - 1] : null;

      return {
        id: code.id,
        position: index,
        name: code.name,
        location:
          code.latitude && code.longitude
            ? { latitude: code.latitude, longitude: code.longitude }
            : null,
        codeHash: await hashRouteCode(game.id, code.code),
        found,
        hint: unlocked ? code.hint : null,
        lockedHint:
          !unlocked && previous ? await encryptHint(game.id, previous.code, code.hint) : null,
      };
    }),
  );

  const wildcardEntry =
    wildcard && game.wildcardEnabled
      ? {
          id: wildcard.id,
          name: game.wildcardName ?? wildcard.name,
          codeHash: await hashRouteCode(game.id, wildcard.code),
          hint: options.hintsReleased ? wildcard.hint : null,
        }
      : null;

  return {
    version: await computeRouteVersion(wildcard ? [...route, wildcard] : route),
    totalCodes: route.length,
    codes: entries,
    wildcard: wildcardEntry,
  };
}
