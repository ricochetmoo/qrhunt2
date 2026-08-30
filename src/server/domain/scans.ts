import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { qr_code_scans, teams } from "@/db/schema";
import type { Game, QrCode, Team } from "@/db/types";
import { canScan } from "@/lib/game-status";
import { normalizeRouteCode } from "@/lib/hint-crypto";
import type { ScanSubmission } from "@/lib/player-schemas";
import {
  CREDITED_SCAN_RESULTS,
  PERSISTED_SCAN_RESULTS,
  SCAN_RESULT_MESSAGES,
  isRetryableScanResult,
  type ScanResult,
} from "@/lib/scan-results";

import { generateId } from "./codes";
import { isUniqueViolation } from "./errors";
import { extractRouteCode } from "./players";

/**
 * Scan rules (AGENTS.md "Routes, QR codes, and scans"). Decisions recorded here:
 *
 * - Progress is the set of route codes a team has been credited for. The next
 *   expected code is the first code in the *current* route order the team has
 *   not found, so admin reorders/insertions after play begins do not strand a team.
 * - Ordering of offline batches follows the client's `scannedAt` (then array
 *   order); every scan is still validated against the authoritative state.
 * - Leaderboard timing uses server receipt time (client clocks are untrusted).
 *   Scoring: codes found desc, wildcard desc, earliest last credited scan asc.
 * - Retryable outcomes (`paused`, `not_started`) are not persisted so the
 *   client can resend the same `clientScanId` later; everything else is
 *   persisted and replays return the stored outcome.
 */

export type CreditedScan = { qrCodeId: string; result: string; createdAt: Date };

export type TeamProgress = {
  foundIds: Set<string>;
  found: number;
  total: number;
  complete: boolean;
  targetIndex: number | null;
  target: QrCode | null;
  wildcardFound: boolean;
  lastScanAt: Date | null;
};

export type ScanOutcome = {
  clientScanId: string;
  code: string;
  result: ScanResult;
  retryable: boolean;
  message: string;
  qrCodeId: string | null;
  qrCodeName: string | null;
  /** Position on the ordered route (0-based), when the code is a route code. */
  position: number | null;
};

export async function listCreditedScans(teamId: string): Promise<CreditedScan[]> {
  return db
    .select({
      qrCodeId: qr_code_scans.qrCodeId,
      result: qr_code_scans.result,
      createdAt: qr_code_scans.createdAt,
    })
    .from(qr_code_scans)
    .where(
      and(eq(qr_code_scans.teamId, teamId), inArray(qr_code_scans.result, [...CREDITED_SCAN_RESULTS])),
    )
    .orderBy(asc(qr_code_scans.createdAt));
}

export function computeProgress(route: QrCode[], credited: CreditedScan[]): TeamProgress {
  const foundIds = new Set(credited.filter((s) => s.result === "accepted").map((s) => s.qrCodeId));
  const targetIndex = route.findIndex((code) => !foundIds.has(code.id));
  const found = route.filter((code) => foundIds.has(code.id)).length;
  const lastScanAt = credited.length > 0 ? credited[credited.length - 1].createdAt : null;

  return {
    foundIds,
    found,
    total: route.length,
    complete: route.length > 0 && found === route.length,
    targetIndex: targetIndex === -1 ? null : targetIndex,
    target: targetIndex === -1 ? null : route[targetIndex],
    wildcardFound: credited.some((s) => s.result === "wildcard"),
    lastScanAt,
  };
}

export type LeaderboardEntry = {
  rank: number;
  teamId: string;
  name: string;
  found: number;
  total: number;
  wildcardFound: boolean;
  lastScanAt: Date | null;
  finishedAt: Date | null;
  isYou: boolean;
};

export async function getLeaderboard(
  gameId: string,
  totalCodes: number,
  youTeamId: string | null,
): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select({
      teamId: teams.id,
      name: teams.name,
      finishedAt: teams.finishedAt,
      found: sql<number>`count(*) filter (where ${qr_code_scans.result} = 'accepted')`.mapWith(Number),
      wildcardFound: sql<boolean>`bool_or(${qr_code_scans.result} = 'wildcard')`.mapWith(Boolean),
      lastScanAt: sql<string | null>`max(${qr_code_scans.createdAt}) filter (where ${qr_code_scans.result} in ('accepted', 'wildcard'))`,
    })
    .from(teams)
    .leftJoin(qr_code_scans, eq(qr_code_scans.teamId, teams.id))
    .where(eq(teams.gameId, gameId))
    .groupBy(teams.id);

  const entries = rows.map((row) => ({
    ...row,
    lastScanAt: row.lastScanAt ? new Date(row.lastScanAt) : null,
  }));

  entries.sort(
    (a, b) =>
      b.found - a.found ||
      Number(b.wildcardFound) - Number(a.wildcardFound) ||
      (a.lastScanAt?.getTime() ?? Infinity) - (b.lastScanAt?.getTime() ?? Infinity) ||
      a.name.localeCompare(b.name),
  );

  return entries.map((entry, index) => ({
    rank: index + 1,
    teamId: entry.teamId,
    name: entry.name,
    found: entry.found,
    total: totalCodes,
    wildcardFound: entry.wildcardFound,
    lastScanAt: entry.lastScanAt,
    finishedAt: entry.finishedAt,
    isYou: entry.teamId === youTeamId,
  }));
}

type PersistArgs = {
  qrCodeId: string;
  teamId: string;
  userId: string;
  result: ScanResult;
  scan: ScanSubmission;
};

async function persistScan(args: PersistArgs) {
  await db.insert(qr_code_scans).values({
    id: generateId(),
    qrCodeId: args.qrCodeId,
    teamId: args.teamId,
    userId: args.userId,
    result: args.result,
    clientScanId: args.scan.clientScanId,
    clientScannedAt: new Date(args.scan.scannedAt),
    latitude: args.scan.latitude ?? null,
    longitude: args.scan.longitude ?? null,
  });
}

function outcome(
  scan: ScanSubmission,
  result: ScanResult,
  code: QrCode | null,
  position: number | null,
): ScanOutcome {
  return {
    clientScanId: scan.clientScanId,
    code: scan.code,
    result,
    retryable: isRetryableScanResult(result),
    message: SCAN_RESULT_MESSAGES[result],
    qrCodeId: code?.id ?? null,
    qrCodeName: code?.name ?? null,
    position,
  };
}

/** Evaluate and record a batch of scans for one team. Returns one outcome per submitted scan. */
export async function syncScans(args: {
  game: Game;
  team: Team;
  userId: string;
  route: QrCode[];
  wildcard: QrCode | null;
  scans: ScanSubmission[];
}): Promise<{ outcomes: ScanOutcome[]; progress: TeamProgress }> {
  const { game, team, userId, route, wildcard } = args;

  // Idempotency: outcomes already recorded for these client ids win.
  const priorRows = await db
    .select({
      clientScanId: qr_code_scans.clientScanId,
      qrCodeId: qr_code_scans.qrCodeId,
      result: qr_code_scans.result,
    })
    .from(qr_code_scans)
    .where(
      and(
        eq(qr_code_scans.teamId, team.id),
        inArray(
          qr_code_scans.clientScanId,
          args.scans.map((scan) => scan.clientScanId),
        ),
      ),
    );
  const prior = new Map(priorRows.map((row) => [row.clientScanId, row]));

  const codesById = new Map<string, QrCode>();
  const codesByValue = new Map<string, QrCode>();
  for (const code of wildcard ? [...route, wildcard] : route) {
    codesById.set(code.id, code);
    codesByValue.set(normalizeRouteCode(code.code), code);
  }
  const positionOf = new Map(route.map((code, index) => [code.id, index]));

  const credited = await listCreditedScans(team.id);
  let progress = computeProgress(route, credited);
  const teamStarted = !game.staggeredStart || team.startedAt !== null;

  const ordered = [...args.scans].sort(
    (a, b) => Date.parse(a.scannedAt) - Date.parse(b.scannedAt),
  );
  const outcomesById = new Map<string, ScanOutcome>();

  for (const scan of ordered) {
    if (outcomesById.has(scan.clientScanId)) {
      continue; // duplicated id within the batch
    }

    const recorded = prior.get(scan.clientScanId);

    if (recorded) {
      const code = codesById.get(recorded.qrCodeId) ?? null;
      outcomesById.set(
        scan.clientScanId,
        outcome(scan, recorded.result as ScanResult, code, code ? (positionOf.get(code.id) ?? null) : null),
      );
      continue;
    }

    const code = codesByValue.get(normalizeRouteCode(extractRouteCode(scan.code)));

    if (!code || (code.isWildcard && !game.wildcardEnabled)) {
      outcomesById.set(scan.clientScanId, outcome(scan, "invalid", null, null));
      continue;
    }

    const position = code.isWildcard ? null : (positionOf.get(code.id) ?? null);

    let result: ScanResult;

    if (!canScan(game.status)) {
      result =
        game.status === "finished" || game.status === "archived"
          ? "late"
          : game.status === "paused"
            ? "paused"
            : "not_started";
    } else if (!teamStarted) {
      result = "not_started";
    } else if (code.isWildcard) {
      result = progress.wildcardFound ? "duplicate" : "wildcard";
    } else if (progress.foundIds.has(code.id)) {
      result = "duplicate";
    } else if (progress.target?.id === code.id) {
      result = "accepted";
    } else {
      result = "out_of_order";
    }

    if (PERSISTED_SCAN_RESULTS.has(result)) {
      try {
        await persistScan({ qrCodeId: code.id, teamId: team.id, userId, result, scan });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }

        // Another device credited this code (or sent this clientScanId) first.
        result = "duplicate";
        await persistScan({ qrCodeId: code.id, teamId: team.id, userId, result, scan }).catch(
          (retryError) => {
            if (!isUniqueViolation(retryError)) throw retryError;
          },
        );
      }
    }

    if (result === "accepted" || result === "wildcard") {
      credited.push({ qrCodeId: code.id, result, createdAt: new Date() });
      progress = computeProgress(route, credited);
    }

    outcomesById.set(scan.clientScanId, outcome(scan, result, code, position));
  }

  if (progress.complete && team.finishedAt === null) {
    await db
      .update(teams)
      .set({ finishedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(teams.id, team.id), sql`${teams.finishedAt} is null`));
  }

  // Return outcomes in the order the client submitted them.
  const outcomes = args.scans.map((scan) => outcomesById.get(scan.clientScanId)!);

  return { outcomes, progress };
}
