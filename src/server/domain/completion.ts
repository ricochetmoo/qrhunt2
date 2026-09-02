import "server-only";

import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { feedback_responses, team_memberships, teams, user } from "@/db/schema";
import type { FeedbackResponse, Game, Team } from "@/db/types";
import { normalizeRouteCode } from "@/lib/hint-crypto";
import type { ReportCompletionInput } from "@/lib/player-schemas";

import { generateId } from "./codes";
import { DomainError } from "./errors";
import { extractRouteCode } from "./players";
import { listQrCodes } from "./qr-codes";
import { splitRoute } from "./route-bundle";
import { computeProgress, listCreditedScans } from "./scans";

/**
 * Finish-line flow. Decisions recorded here:
 *
 * - The finish-line code (qr_codes.is_completion) is the capability proof: a
 *   team checks in only by presenting it, which they do by scanning it at the
 *   Digital Team tent. It is never a route stop.
 * - Checking in requires the route to be complete against the *current* route,
 *   the same rule the completion screen uses.
 * - The fun score and comments are the gate. Keep-updated contact details are
 *   optional and only stored when the player opts in; one row per player per
 *   team, and checking in again revises it.
 * - `reportedCompletedAt` is set once (first check-in); `prizeIssuedAt` is set
 *   by an organiser from the admin badge queue and can be undone.
 */

export async function reportCompletion(
  game: Game,
  team: Team,
  userId: string,
  input: ReportCompletionInput,
): Promise<Team> {
  const { route, completion } = splitRoute(await listQrCodes(game.id));
  const presented = normalizeRouteCode(extractRouteCode(input.code));

  if (!completion || normalizeRouteCode(completion.code) !== presented) {
    throw new DomainError("COMPLETION_CODE", "That isn't this game's finish-line code.");
  }

  const progress = computeProgress(route, await listCreditedScans(team.id), {
    loop: game.allowOutOfOrder,
  });

  if (!progress.complete) {
    throw new DomainError(
      "ROUTE_INCOMPLETE",
      `You've found ${progress.found} of ${progress.total} stops. Come back once you've found them all.`,
    );
  }

  const now = new Date();
  // Contact details are personal data: keep them only with consent.
  const feedback = {
    funScore: input.funScore,
    comments: input.comments,
    keepUpdated: input.keepUpdated,
    contactName: input.keepUpdated ? (input.contactName ?? null) : null,
    contactEmail: input.keepUpdated ? (input.contactEmail ?? null) : null,
    contactRole: input.keepUpdated ? (input.contactRole ?? null) : null,
    additionalInfo: input.keepUpdated ? (input.additionalInfo ?? null) : null,
  };

  await db
    .insert(feedback_responses)
    .values({ id: generateId(), gameId: game.id, teamId: team.id, userId, ...feedback })
    .onConflictDoUpdate({
      target: [feedback_responses.teamId, feedback_responses.userId],
      set: { ...feedback, updatedAt: now },
    });

  const [updated] = await db
    .update(teams)
    .set({
      reportedCompletedAt: sql`coalesce(${teams.reportedCompletedAt}, now())`,
      updatedAt: now,
    })
    .where(eq(teams.id, team.id))
    .returning();

  return updated;
}

export type CompletionEntry = {
  team: Pick<Team, "id" | "name" | "finishedAt" | "reportedCompletedAt" | "prizeIssuedAt">;
  members: { userId: string; name: string }[];
  feedback: Pick<
    FeedbackResponse,
    | "userId"
    | "funScore"
    | "comments"
    | "keepUpdated"
    | "contactName"
    | "contactEmail"
    | "contactRole"
    | "additionalInfo"
    | "updatedAt"
  >[];
};

/**
 * Teams that have checked in at the finish line, for the admin badge queue.
 * Waiting teams first (oldest check-in first), then issued (latest first).
 */
export async function listCompletions(gameId: string): Promise<CompletionEntry[]> {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      finishedAt: teams.finishedAt,
      reportedCompletedAt: teams.reportedCompletedAt,
      prizeIssuedAt: teams.prizeIssuedAt,
    })
    .from(teams)
    .where(and(eq(teams.gameId, gameId), isNotNull(teams.reportedCompletedAt)))
    .orderBy(asc(teams.reportedCompletedAt));

  if (rows.length === 0) {
    return [];
  }

  const teamIds = rows.map((row) => row.id);
  const [members, feedback] = await Promise.all([
    db
      .select({ teamId: team_memberships.teamId, userId: user.id, name: user.name })
      .from(team_memberships)
      .innerJoin(user, eq(user.id, team_memberships.userId))
      .where(inArray(team_memberships.teamId, teamIds))
      .orderBy(asc(team_memberships.createdAt)),
    db
      .select({
        teamId: feedback_responses.teamId,
        userId: feedback_responses.userId,
        funScore: feedback_responses.funScore,
        comments: feedback_responses.comments,
        keepUpdated: feedback_responses.keepUpdated,
        contactName: feedback_responses.contactName,
        contactEmail: feedback_responses.contactEmail,
        contactRole: feedback_responses.contactRole,
        additionalInfo: feedback_responses.additionalInfo,
        updatedAt: feedback_responses.updatedAt,
      })
      .from(feedback_responses)
      .where(inArray(feedback_responses.teamId, teamIds)),
  ]);

  const entries = rows.map((team) => ({
    team,
    members: members
      .filter((member) => member.teamId === team.id)
      .map(({ userId, name }) => ({ userId, name })),
    feedback: feedback
      .filter((row) => row.teamId === team.id)
      .map((row) => ({
        userId: row.userId,
        funScore: row.funScore,
        comments: row.comments,
        keepUpdated: row.keepUpdated,
        contactName: row.contactName,
        contactEmail: row.contactEmail,
        contactRole: row.contactRole,
        additionalInfo: row.additionalInfo,
        updatedAt: row.updatedAt,
      })),
  }));

  entries.sort((a, b) => {
    const aIssued = a.team.prizeIssuedAt?.getTime() ?? null;
    const bIssued = b.team.prizeIssuedAt?.getTime() ?? null;

    if ((aIssued === null) !== (bIssued === null)) return aIssued === null ? -1 : 1;
    if (aIssued !== null && bIssued !== null) return bIssued - aIssued;

    return (a.team.reportedCompletedAt?.getTime() ?? 0) - (b.team.reportedCompletedAt?.getTime() ?? 0);
  });

  return entries;
}

/** Mark (or unmark) a checked-in team's badge as issued. Idempotent. */
export async function setPrizeIssued(gameId: string, teamId: string, issued: boolean): Promise<Team> {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.gameId, gameId)))
    .limit(1);

  if (!team) {
    throw new DomainError("NOT_FOUND", "Team not found.");
  }

  if (!team.reportedCompletedAt) {
    throw new DomainError("CONFLICT", "This team hasn't checked in at the finish line yet.");
  }

  const [updated] = await db
    .update(teams)
    .set({
      prizeIssuedAt: issued ? sql`coalesce(${teams.prizeIssuedAt}, now())` : null,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId))
    .returning();

  return updated;
}
