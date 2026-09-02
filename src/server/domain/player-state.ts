import "server-only";

import type { Game, Team } from "@/db/types";
import { canScan, hasStarted } from "@/lib/game-status";
import { isCreditedScanResult } from "@/lib/scan-results";

import { DomainError } from "./errors";
import { requireVisibleGame } from "./players";
import { listQrCodes } from "./qr-codes";
import { buildRouteBundle, splitRoute, type RouteBundle } from "./route-bundle";
import { computeProgress, getLeaderboard, listTeamScans, type LeaderboardEntry } from "./scans";
import { getTeamForUser, listTeamMembers } from "./teams";

/**
 * Everything the player UI needs in one response (AGENTS.md: "Keep aggregate
 * responses together"). Returned by GET .../state and by every player mutation.
 */
export type PlayerState = {
  serverTime: string;
  game: {
    id: string;
    name: string;
    status: string;
    /** "speed" or "completeness" — how the leaderboard ranks (src/lib/game-mode.ts). */
    mode: string;
    pauseReason: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    completionMessage: string | null;
    wildcard: { enabled: boolean; name: string | null };
    settings: {
      allowOutOfOrder: boolean;
      allowTeamCreation: boolean;
      allowTeamNames: boolean;
      allowTeamPhotos: boolean;
      staggeredStart: boolean;
    };
    issueContactPhone: string | null;
    /** Open decision (AGENTS.md): map-boundary format. Always null for now. */
    mapBoundary: null;
  };
  route: RouteBundle;
  team: {
    id: string;
    name: string;
    teamCode: string;
    photoUrl: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    members: { userId: string; name: string; isYou: boolean }[];
  } | null;
  progress: {
    found: number;
    total: number;
    complete: boolean;
    wildcardFound: boolean;
    lastScanAt: Date | null;
    /** The stop most recently found, with its clue — "you are here". */
    lastFound: {
      position: number;
      name: string;
      hint: string;
      location: { latitude: string; longitude: string } | null;
      scannedAt: Date;
    } | null;
    /** Hints have been released to this team (game started; team released if staggered). */
    hintsReleased: boolean;
    /** Scans would be accepted right now. */
    canScan: boolean;
    nextHint: string | null;
    nextCodeName: string | null;
    nextPosition: number | null;
  } | null;
  /**
   * The team's persisted scans, newest first (capped at HISTORY_LIMIT).
   * Retryable (`paused`/`not_started`) and `invalid` outcomes are never
   * persisted, so they cannot appear here.
   */
  history: {
    id: string;
    /** Authoritative outcome (src/lib/scan-results.ts). */
    result: string;
    stopName: string | null;
    /** 0-based position on the ordered route; null for the wildcard. */
    position: number | null;
    isWildcard: boolean;
    scannedByUserId: string;
    scannedAt: Date;
  }[];
  leaderboard: LeaderboardEntry[];
};

/** History entries returned per state response; older scans are elided, not lost. */
const HISTORY_LIMIT = 50;

function hintsReleasedFor(game: Game, team: Team): boolean {
  if (!hasStarted(game.status)) return false;
  if (game.staggeredStart) return team.startedAt != null;
  return true;
}

/**
 * The game plus proof the user belongs to one of its teams — the only
 * persistent game membership. Everything after enrolment is gated on this.
 */
export async function requireTeamMember(
  gameId: string,
  userId: string,
): Promise<{ game: Game; team: Team }> {
  const game = await requireVisibleGame(gameId);
  const team = await getTeamForUser(gameId, userId);

  if (!team) {
    throw new DomainError("NOT_IN_TEAM", "Join a team in this game first.");
  }

  return { game, team };
}

async function buildState(game: Game, team: Team | null, userId: string): Promise<PlayerState> {
  const codes = await listQrCodes(game.id);
  const { route, wildcard } = splitRoute(codes);

  // Pre-team previews reveal nothing: the bundle stays fully locked.
  const hintsReleased = team ? hintsReleasedFor(game, team) : false;
  const scans = team ? await listTeamScans(team.id) : [];
  const credited = scans.filter((scan) => isCreditedScanResult(scan.result));
  const progress = team ? computeProgress(route, credited) : null;

  const lastAccepted = [...credited].reverse().find((scan) => scan.result === "accepted") ?? null;
  const lastFoundIndex = lastAccepted
    ? route.findIndex((code) => code.id === lastAccepted.qrCodeId)
    : -1;
  const lastFound =
    lastAccepted && lastFoundIndex !== -1
      ? {
          position: lastFoundIndex,
          name: route[lastFoundIndex].name,
          hint: route[lastFoundIndex].hint,
          location:
            route[lastFoundIndex].latitude && route[lastFoundIndex].longitude
              ? {
                  latitude: route[lastFoundIndex].latitude!,
                  longitude: route[lastFoundIndex].longitude!,
                }
              : null,
          scannedAt: lastAccepted.createdAt,
        }
      : null;

  const positionOf = new Map(route.map((code, index) => [code.id, index]));
  const nameOf = new Map(codes.map((code) => [code.id, code.name]));
  const history = scans
    .slice(-HISTORY_LIMIT)
    .reverse()
    .map((scan) => ({
      id: scan.id,
      result: scan.result,
      stopName: nameOf.get(scan.qrCodeId) ?? null,
      position: positionOf.get(scan.qrCodeId) ?? null,
      isWildcard: scan.qrCodeId === wildcard?.id,
      scannedByUserId: scan.userId,
      scannedAt: scan.createdAt,
    }));

  const [bundle, members, leaderboard] = await Promise.all([
    buildRouteBundle(game, route, wildcard, {
      foundIds: progress?.foundIds ?? new Set<string>(),
      hintsReleased,
    }),
    team ? listTeamMembers(team.id) : Promise.resolve([]),
    getLeaderboard(game.id, route.length, team?.id ?? null, game.gameMode),
  ]);

  return {
    serverTime: new Date().toISOString(),
    game: {
      id: game.id,
      name: game.name,
      status: game.status,
      mode: game.gameMode,
      pauseReason: game.status === "paused" ? game.pauseReason : null,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      completionMessage: game.completionMessage ?? null,
      wildcard: { enabled: game.wildcardEnabled, name: game.wildcardName },
      settings: {
        allowOutOfOrder: game.allowOutOfOrder,
        allowTeamCreation: game.allowSelfSignup && game.allowTeamCreation,
        allowTeamNames: game.allowTeamNames,
        allowTeamPhotos: game.allowTeamPhotos,
        staggeredStart: game.staggeredStart,
      },
      issueContactPhone: game.issueContactPhone,
      mapBoundary: null,
    },
    route: bundle,
    team: team
      ? {
          id: team.id,
          name: team.name,
          teamCode: team.teamCode,
          photoUrl: team.photoUrl,
          startedAt: team.startedAt,
          finishedAt: team.finishedAt,
          members: members.map((member) => ({ ...member, isYou: member.userId === userId })),
        }
      : null,
    progress: progress
      ? {
          found: progress.found,
          total: progress.total,
          complete: progress.complete,
          wildcardFound: progress.wildcardFound,
          lastScanAt: progress.lastScanAt,
          lastFound,
          hintsReleased,
          canScan: canScan(game.status) && hintsReleased,
          nextHint: hintsReleased ? (progress.target?.hint ?? null) : null,
          nextCodeName: hintsReleased ? (progress.target?.name ?? null) : null,
          nextPosition: progress.targetIndex,
        }
      : null,
    history,
    leaderboard,
  };
}

/** Full state for an enrolled player (team membership required). */
export async function getPlayerState(gameId: string, userId: string): Promise<PlayerState> {
  const { game, team } = await requireTeamMember(gameId, userId);

  return buildState(game, team, userId);
}

/**
 * One-shot state returned by `POST /join` before the player has a team: same
 * shape, but `team`/`progress` are null and the route bundle is fully locked.
 * There is no other pre-team read access.
 */
export async function getGamePreview(game: Game, userId: string): Promise<PlayerState> {
  return buildState(game, null, userId);
}
