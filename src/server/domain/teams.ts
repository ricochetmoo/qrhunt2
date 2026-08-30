import "server-only";

import { and, asc, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { games, team_memberships, teams, user } from "@/db/schema";
import type { Game, Team } from "@/db/types";
import { isJoinable, isPlayerVisible } from "@/lib/game-status";
import type { UpdateTeamInput } from "@/lib/player-schemas";

import { generateId, generateTeamCode } from "./codes";
import { DomainError, isUniqueViolation } from "./errors";

const TEAM_CODE_INSERT_ATTEMPTS = 3;

/**
 * Team size is unlimited for now (AGENTS.md open decision: "team size limits,
 * team-code rotation, and what happens when a team is full").
 */

export type TeamMember = { userId: string; name: string };

export async function findTeamByCode(teamCode: string): Promise<Team | undefined> {
  const [team] = await db.select().from(teams).where(eq(teams.teamCode, teamCode)).limit(1);

  return team;
}

export async function getTeam(teamId: string): Promise<Team | undefined> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);

  return team;
}

/** The team the user belongs to within a game, if any. */
export async function getTeamForUser(gameId: string, userId: string): Promise<Team | undefined> {
  const [row] = await db
    .select({ team: teams })
    .from(team_memberships)
    .innerJoin(teams, eq(team_memberships.teamId, teams.id))
    .where(and(eq(team_memberships.userId, userId), eq(teams.gameId, gameId)))
    .limit(1);

  return row?.team;
}

export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: team_memberships.id })
    .from(team_memberships)
    .where(and(eq(team_memberships.teamId, teamId), eq(team_memberships.userId, userId)))
    .limit(1);

  return Boolean(row);
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  return db
    .select({ userId: user.id, name: user.name })
    .from(team_memberships)
    .innerJoin(user, eq(team_memberships.userId, user.id))
    .where(eq(team_memberships.teamId, teamId))
    .orderBy(asc(team_memberships.createdAt));
}

async function defaultTeamName(gameId: string): Promise<string> {
  const [{ total }] = await db.select({ total: count() }).from(teams).where(eq(teams.gameId, gameId));

  return `Team ${total + 1}`;
}

async function addMembership(teamId: string, userId: string) {
  await db.insert(team_memberships).values({ id: generateId(), teamId, userId });
}

/** Create a team in a game and make the user its first member. Returns the team (with its code). */
export async function createTeam(game: Game, userId: string, name?: string | null): Promise<Team> {
  if (!isJoinable(game.status)) {
    throw new DomainError("GAME_NOT_JOINABLE", "This game is not open for teams right now.");
  }

  if (!game.allowSelfSignup || !game.allowTeamCreation) {
    throw new DomainError(
      "TEAM_CREATION_DISABLED",
      "Players cannot create teams in this game. Ask an organiser for a team code.",
    );
  }

  const existing = await getTeamForUser(game.id, userId);

  if (existing) {
    throw new DomainError("ALREADY_IN_TEAM", `You are already in team "${existing.name}".`);
  }

  const teamName = game.allowTeamNames && name ? name : await defaultTeamName(game.id);

  for (let attempt = 1; ; attempt++) {
    try {
      const [team] = await db
        .insert(teams)
        .values({ id: generateId(), gameId: game.id, name: teamName, teamCode: generateTeamCode() })
        .returning();

      await addMembership(team.id, userId);

      return team;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= TEAM_CODE_INSERT_ATTEMPTS) {
        throw error;
      }
    }
  }
}

/** Join an existing team. Idempotent if already a member; refuses if in another team. */
export async function joinTeam(game: Game, team: Team, userId: string): Promise<Team> {
  if (team.gameId !== game.id) {
    throw new DomainError("NOT_FOUND", "No team with that code in this game.");
  }

  if (!isJoinable(game.status)) {
    throw new DomainError("GAME_NOT_JOINABLE", "This game is not open for teams right now.");
  }

  const existing = await getTeamForUser(game.id, userId);

  if (existing) {
    if (existing.id === team.id) {
      return team;
    }

    throw new DomainError("ALREADY_IN_TEAM", `You are already in team "${existing.name}".`);
  }

  await addMembership(team.id, userId);

  return team;
}

/** Update the team's name/photo on behalf of one of its members. */
export async function updateTeam(
  teamId: string,
  userId: string,
  patch: UpdateTeamInput,
): Promise<{ team: Team; game: Game }> {
  const team = await getTeam(teamId);

  if (!team) {
    throw new DomainError("NOT_FOUND", "Team not found.");
  }

  const [game] = await db.select().from(games).where(eq(games.id, team.gameId)).limit(1);

  if (!game || !isPlayerVisible(game.status)) {
    throw new DomainError("GAME_UNAVAILABLE", "This game is not available.");
  }

  if (!(await isTeamMember(team.id, userId))) {
    throw new DomainError("NOT_IN_TEAM", "You are not a member of this team.");
  }

  if (!isJoinable(game.status)) {
    throw new DomainError("CONFLICT", "The game has finished; the team can no longer be changed.");
  }

  if (patch.name !== undefined && !game.allowTeamNames) {
    throw new DomainError("FEATURE_DISABLED", "Team names cannot be changed in this game.");
  }

  if (patch.photoUrl !== undefined && !game.allowTeamPhotos) {
    throw new DomainError("FEATURE_DISABLED", "Team photos are not enabled in this game.");
  }

  const [updated] = await db
    .update(teams)
    .set({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.photoUrl !== undefined && { photoUrl: patch.photoUrl }),
      updatedAt: new Date(),
    })
    .where(eq(teams.id, team.id))
    .returning();

  return { team: updated, game };
}
