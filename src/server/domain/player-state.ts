import "server-only";

import type { Game, Team } from "@/db/types";
import { canScan, hasStarted } from "@/lib/game-status";

import { requireGamePlayer } from "./players";
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

function hintsReleasedFor(game: Game, team: Team | null): boolean {
  if (!hasStarted(game.status)) return false;
  if (game.staggeredStart) return team?.startedAt != null;
  return true;
}

export async function getPlayerState(gameId: string, userId: string): Promise<PlayerState> {
  const { game } = await requireGamePlayer(gameId, userId);
  const [team, codes] = await Promise.all([getTeamForUser(gameId, userId), listQrCodes(gameId)]);
  const { route, wildcard } = splitRoute(codes);

  const hintsReleased = hintsReleasedFor(game, team ?? null);
  const progress = team ? computeProgress(route, await listCreditedScans(team.id)) : null;

  const [bundle, members, leaderboard] = await Promise.all([
    buildRouteBundle(game, route, wildcard, {
      foundIds: progress?.foundIds ?? new Set<string>(),
      targetIndex: progress?.targetIndex ?? (hintsReleased ? 0 : null),
      hintsReleased,
    }),
    team ? listTeamMembers(team.id) : Promise.resolve([]),
    getLeaderboard(gameId, route.length, team?.id ?? null),
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
