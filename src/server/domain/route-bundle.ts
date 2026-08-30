import "server-only";

import type { Game, QrCode } from "@/db/types";
import { encryptHintPayload, hashRouteCode, type EncryptedHint } from "@/lib/hint-crypto";

/**
 * The offline route bundle handed to players. Never contains a code, and a
 * stop's secrets (hint AND map location) appear in plaintext only once that
 * stop is unlocked — otherwise they travel inside `lockedPayload`, encrypted
 * with the previous code on the route. See `src/lib/hint-crypto.ts`.
 */
export type RouteBundleEntry = {
  id: string;
  position: number; // 0-based index on the ordered route
  name: string;
  codeHash: string;
  found: boolean;
  /** Plaintext when unlocked (found, or the current target once the game has started). */
  hint: string | null;
  /** Revealed alongside `hint`; hidden while the stop is locked. */
  location: { latitude: string; longitude: string } | null;
  /** `{hint, location}` encrypted with the previous position's code (see HintPayload);
   *  null for position 0 or when the plaintext fields are set. */
  lockedPayload: EncryptedHint | null;
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
      const location =
        code.latitude && code.longitude
          ? { latitude: code.latitude, longitude: code.longitude }
          : null;

      return {
        id: code.id,
        position: index,
        name: code.name,
        codeHash: await hashRouteCode(game.id, code.code),
        found,
        hint: unlocked ? code.hint : null,
        location: unlocked ? location : null,
        lockedPayload:
          !unlocked && previous
            ? await encryptHintPayload(game.id, previous.code, { hint: code.hint, location })
            : null,
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
