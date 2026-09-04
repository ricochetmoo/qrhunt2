import type { QrCode } from "@/db/types";
import type { Progress, Scanned, TeamProgress } from "@/server/admin/dashboard/types";

export const STALL_THRESHOLD_MS = 20 * 60_000;

const asDate = (value: Date | string | number): Date =>
  value instanceof Date ? value : new Date(value);

function asTime(value: Date | string | number): number {
  return asDate(value).getTime();
}

export function scannedCount(scans: Scanned[]): number {
  return scans.reduce((n, s) => (s.scanned ? n + 1 : n), 0);
}

export function furthestScannedIndex(scans: Scanned[]): number {
  let index = -1;
  scans.forEach((s, i) => {
    if (s.scanned) index = i;
  });
  return index;
}

export function firstScan(scans: Scanned[]): Extract<Scanned, { scanned: true }> | undefined {
  let first: Extract<Scanned, { scanned: true }> | undefined;
  for (const s of scans) {
    if (!s.scanned) continue;
    if (!first || asTime(s.scan.createdAt) < asTime(first.scan.createdAt)) first = s;
  }
  return first;
}

export function lastScan(scans: Scanned[]): Extract<Scanned, { scanned: true }> | undefined {
  let latest: Extract<Scanned, { scanned: true }> | undefined;
  for (const s of scans) {
    if (!s.scanned) continue;
    if (!latest || asTime(s.scan.createdAt) > asTime(latest.scan.createdAt)) latest = s;
  }
  return latest;
}

export const CODE_SCAN_DELAY_FACTOR = 2;

export type CodeScanStatus = {
  code: QrCode;
  lastScannedAt: number | null;
  overdue: boolean;
};

export type CodeScanSummary = {
  codes: CodeScanStatus[];
  averageAgeMs: number | null;
  overdueAfterMs: number | null;
};

export function buildCodeScanSummary(
  route: QrCode[],
  progress: Progress,
  nowMs: number,
): CodeScanSummary {
  const lastScannedAtByCode = new Map<string, number>();

  for (const row of progress) {
    for (const item of row.scans) {
      if (!item.scanned) continue;

      const scannedAt = asTime(item.scan.createdAt);
      if (!Number.isFinite(scannedAt)) continue;

      const previous = lastScannedAtByCode.get(item.code.id);
      if (previous === undefined || scannedAt > previous) {
        lastScannedAtByCode.set(item.code.id, scannedAt);
      }
    }
  }

  const ages = route.flatMap((code) => {
    const lastScannedAt = lastScannedAtByCode.get(code.id);
    return lastScannedAt === undefined ? [] : [Math.max(0, nowMs - lastScannedAt)];
  });
  const averageAgeMs = ages.length ? ages.reduce((total, age) => total + age, 0) / ages.length : null;
  const overdueAfterMs = averageAgeMs === null ? null : averageAgeMs * CODE_SCAN_DELAY_FACTOR;

  return {
    codes: route.map((code) => {
      const lastScannedAt = lastScannedAtByCode.get(code.id) ?? null;
      const ageMs = lastScannedAt === null ? null : Math.max(0, nowMs - lastScannedAt);

      return {
        code,
        lastScannedAt,
        overdue: ageMs !== null && overdueAfterMs !== null && ageMs > overdueAfterMs,
      };
    }),
    averageAgeMs,
    overdueAfterMs,
  };
}

export type TeamStanding = {
  team: TeamProgress["team"];
  memberCount: number;
  completed: number;
  total: number;
  ratio: number;
  furthestIndex: number;
  furthestName: string | null;
  lastScanAt: number | null;
  paceMs: number | null;
  remaining: number;
  etaMs: number | null;
  stalled: boolean;
  finished: boolean;
};

export function buildStandings(progress: Progress, nowMs: number): TeamStanding[] {
  const standings = progress.map((row) => {
    const total = row.scans.length;
    const completed = scannedCount(row.scans);
    const furthestIndex = furthestScannedIndex(row.scans);
    const first = firstScan(row.scans);
    const last = lastScan(row.scans);

    let paceMs: number | null = null;
    if (first && last && completed >= 2) {
      const elapsed = asTime(last.scan.createdAt) - asTime(first.scan.createdAt);
      if (elapsed > 0) paceMs = Math.round(elapsed / (completed - 1));
    }

    const remaining = Math.max(0, total - completed);
    const etaMs = paceMs !== null && remaining > 0 ? paceMs * remaining : null;
    const lastScanAt = last ? asTime(last.scan.createdAt) : null;
    const finished = completed > 0 && completed === total;
    const stalled = !finished && lastScanAt !== null && nowMs - lastScanAt > STALL_THRESHOLD_MS;

    return {
      team: row.team,
      memberCount: row.memberCount,
      completed,
      total,
      ratio: total === 0 ? 0 : completed / total,
      furthestIndex,
      furthestName: furthestIndex >= 0 ? row.scans[furthestIndex].code.name : null,
      lastScanAt,
      paceMs,
      remaining,
      etaMs,
      stalled,
      finished,
    };
  });

  standings.sort((a, b) => {
    if (b.furthestIndex !== a.furthestIndex) return b.furthestIndex - a.furthestIndex;
    if (a.furthestIndex < 0) return 0;
    const aLast = a.lastScanAt ?? Number.POSITIVE_INFINITY;
    const bLast = b.lastScanAt ?? Number.POSITIVE_INFINITY;
    return aLast - bLast;
  });

  return standings;
}

export type CheckpointStat = {
  code: QrCode;
  index: number;
  reached: number;
  dropOff: number;
  stuck: number;
};

export function buildCheckpointStats(route: QrCode[], progress: Progress): CheckpointStat[] {
  const reached = route.map((_, i) =>
    progress.reduce((n, row) => n + (scannedCount(row.scans) > i ? 1 : 0), 0),
  );

  return route.map((code, i) => {
    const isLast = i === route.length - 1;
    const stuck = isLast
      ? 0
      : progress.reduce(
          (n, row) => n + (furthestScannedIndex(row.scans) === i ? 1 : 0),
          0,
        );

    return {
      code,
      index: i,
      reached: reached[i],
      dropOff: isLast ? 0 : reached[i] - (reached[i + 1] ?? 0),
      stuck,
    };
  });
}

export type ActivityBucket = { t: number; count: number };

export function buildActivitySeries(
  progress: Progress,
  nowMs: number,
  maxBins = 60,
): ActivityBucket[] {
  const times: number[] = [];
  for (const row of progress) {
    for (const s of row.scans) {
      if (s.scanned) times.push(asTime(s.scan.createdAt));
    }
  }
  if (times.length === 0) return [];

  const min = Math.min(...times);
  const span = Math.max(nowMs - min, 60_000);
  const binCount = Math.min(maxBins, Math.max(1, Math.ceil(span / 60_000)));
  const binSize = span / binCount;

  const buckets: ActivityBucket[] = Array.from({ length: binCount }, (_, i) => ({
    t: min + i * binSize,
    count: 0,
  }));

  for (const t of times) {
    const idx = Math.min(binCount - 1, Math.floor((t - min) / binSize));
    buckets[idx].count += 1;
  }

  return buckets;
}

export function relativeTime(
  date: Date | string | number,
  now: Date | string | number = Date.now(),
): string {
  const diffMs = asTime(now) - asTime(date);
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return asDate(date).toLocaleString();
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);

  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function formatEtaClock(etaMs: number, nowMs: number): string {
  return new Date(nowMs + etaMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
