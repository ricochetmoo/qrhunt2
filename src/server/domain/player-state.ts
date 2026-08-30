import "server-only";

import type { Game, Team } from "@/db/types";
import { canScan, hasStarted } from "@/lib/game-status";

import { DomainError } from "./errors";
import { requireVisibleGame } from "./players";
import { listQrCodes } from "./qr-codes";
import { buildRouteBundle, splitRoute, type RouteBundle } from "./route-bundle";
import { computeProgress, getLeaderboard, listCreditedScans, type LeaderboardEntry } from "./scans";
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
    pauseReason: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    wildcard: { enabled: boolean; name: string | null };
    settings: {
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
    /** Hints have been released to this team (game started; team released if staggered). */
    hintsReleased: boolean;
    /** Scans would be accepted right now. */
    canScan: boolean;
    nextHint: string | null;
    nextCodeName: string | null;
    nextPosition: number | null;
  } | null;
  leaderboard: LeaderboardEntry[];
};

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
  const progress = team ? computeProgress(route, await listCreditedScans(team.id)) : null;

  const [bundle, members, leaderboard] = await Promise.all([
    buildRouteBundle(game, route, wildcard, {
      foundIds: progress?.foundIds ?? new Set<string>(),
      targetIndex: hintsReleased ? (progress?.targetIndex ?? null) : null,
      hintsReleased,
    }),
    team ? listTeamMembers(team.id) : Promise.resolve([]),
    getLeaderboard(game.id, route.length, team?.id ?? null),
  ]);

  return {
    serverTime: new Date().toISOString(),
    game: {
      id: game.id,
      name: game.name,
      status: game.status,
      pauseReason: game.status === "paused" ? game.pauseReason : null,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
      wildcard: { enabled: game.wildcardEnabled, name: game.wildcardName },
      settings: {
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
          hintsReleased,
          canScan: canScan(game.status) && hintsReleased,
          nextHint: hintsReleased ? (progress.target?.hint ?? null) : null,
          nextCodeName: hintsReleased ? (progress.target?.name ?? null) : null,
          nextPosition: progress.targetIndex,
        }
      : null,
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
