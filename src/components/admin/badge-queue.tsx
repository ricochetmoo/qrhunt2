"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/field";
import { apiClient } from "@/lib/api-client";
import { readError } from "@/lib/api-errors";
import { relativeTime } from "@/lib/dashboard";

/** The finish-line desk polls: it is used live at the tent while teams arrive. */
const POLL_INTERVAL_MS = 10_000;

/** `CompletionEntry` (server/domain/completion.ts) as it arrives over JSON: dates are ISO strings. */
type Entry = {
  team: {
    id: string;
    name: string;
    finishedAt: string | null;
    reportedCompletedAt: string | null;
    prizeIssuedAt: string | null;
  };
  members: { userId: string; name: string }[];
  feedback: {
    userId: string;
    funScore: number | null;
    comments: string | null;
    keepUpdated: boolean;
    contactName: string | null;
    contactEmail: string | null;
    contactRole: string | null;
    additionalInfo: string | null;
    updatedAt: string;
  }[];
};

const timeFormat = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });

export function BadgeQueue({ gameId }: { gameId: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    // No state updates before the first await: this runs from an effect.
    try {
      const response = await apiClient.api.admin.games[":gameId"].completions.$get({
        param: { gameId },
      });

      if (!response.ok) {
        setError(`Request failed (${response.status}).`);
        return;
      }

      const { completions } = (await response.json()) as unknown as { completions: Entry[] };
      setEntries(completions);
      setNowMs(Date.now());
      setError(null);
    } catch {
      setError("Could not load the badge queue. Check your connection.");
    }
  }, [gameId]);

  useEffect(() => {
    // Fetch-on-mount: state updates land after the network await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [load]);

  async function setIssued(teamId: string, issued: boolean) {
    setBusyTeamId(teamId);
    setError(null);

    try {
      const route = apiClient.api.admin.games[":gameId"].teams[":teamId"].prize;
      const response = issued
        ? await route.$post({ param: { gameId, teamId } })
        : await route.$delete({ param: { gameId, teamId } });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      await load();
    } catch {
      setError("That didn't go through - try again.");
    } finally {
      setBusyTeamId(null);
    }
  }

  const waiting = entries?.filter((entry) => !entry.team.prizeIssuedAt) ?? [];
  const issued = entries?.filter((entry) => entry.team.prizeIssuedAt) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Badges"
        description="Teams that have checked in at the finish line. Mark each badge as issued when you hand it over. Updates every 10 seconds."
        actions={
          <>
            <Link
              href={`/admin/games/${gameId}/dashboard`}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              View dashboard
            </Link>
            <Link
              href={`/admin/games/${gameId}/edit`}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Manage game
            </Link>
          </>
        }
      />

      <ErrorMessage message={error} />

      {entries === null && !error ? <p className="text-sm text-slate-500">Loading…</p> : null}

      {entries !== null ? (
        <>
          <Card>
            <CardHeader
              title={`Waiting for a badge (${waiting.length})`}
              description="Oldest check-in first."
            />
            <CardBody>
              {waiting.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No one is waiting. Teams appear here as soon as they check in at the tent.
                </p>
              ) : (
                <ol className="divide-y divide-slate-100">
                  {waiting.map((entry) => (
                    <CompletionRow
                      key={entry.team.id}
                      entry={entry}
                      nowMs={nowMs}
                      busy={busyTeamId === entry.team.id}
                      onToggle={() => setIssued(entry.team.id, true)}
                    />
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Badges issued (${issued.length})`} description="Most recent first." />
            <CardBody>
              {issued.length === 0 ? (
                <p className="text-sm text-slate-500">No badges issued yet.</p>
              ) : (
                <ol className="divide-y divide-slate-100">
                  {issued.map((entry) => (
                    <CompletionRow
                      key={entry.team.id}
                      entry={entry}
                      nowMs={nowMs}
                      busy={busyTeamId === entry.team.id}
                      onToggle={() => setIssued(entry.team.id, false)}
                    />
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function CompletionRow({
  entry,
  nowMs,
  busy,
  onToggle,
}: {
  entry: Entry;
  nowMs: number;
  busy: boolean;
  onToggle: () => void;
}) {
  const { team, members, feedback } = entry;
  const issued = Boolean(team.prizeIssuedAt);

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-base font-semibold text-slate-900">{team.name}</span>
          {members.length > 0 ? (
            <span className="text-xs text-slate-500">
              {members.map((member) => member.name).join(", ")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            Checked in{" "}
            <span className="font-medium text-slate-700">
              {team.reportedCompletedAt
                ? `${relativeTime(team.reportedCompletedAt, nowMs)} (${timeFormat.format(new Date(team.reportedCompletedAt))})`
                : "-"}
            </span>
          </span>
          {team.finishedAt ? (
            <span>
              Route done{" "}
              <span className="font-medium text-slate-700">
                {timeFormat.format(new Date(team.finishedAt))}
              </span>
            </span>
          ) : null}
          {team.prizeIssuedAt ? (
            <span>
              Badge issued{" "}
              <span className="font-medium text-slate-700">
                {timeFormat.format(new Date(team.prizeIssuedAt))}
              </span>
            </span>
          ) : null}
        </div>

        {feedback.map((row) => (
          <div key={row.userId} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {row.funScore !== null ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  Fun {row.funScore}/10
                </span>
              ) : null}
              {row.keepUpdated ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  Wants updates
                </span>
              ) : null}
            </div>
            {row.comments ? (
              <p className="mt-1 whitespace-pre-line text-slate-700">{row.comments}</p>
            ) : null}
            {row.keepUpdated ? (
              <details className="mt-1 text-xs text-slate-600">
                <summary className="cursor-pointer select-none">Contact details</summary>
                <div className="mt-1 space-y-0.5">
                  {row.contactName ? (
                    <p>
                      <span className="font-medium">Name:</span> {row.contactName}
                    </p>
                  ) : null}
                  {row.contactEmail ? (
                    <p>
                      <span className="font-medium">Email:</span> {row.contactEmail}
                    </p>
                  ) : null}
                  {row.contactRole ? (
                    <p>
                      <span className="font-medium">Role:</span> {row.contactRole}
                    </p>
                  ) : null}
                  {row.additionalInfo ? (
                    <p className="whitespace-pre-line">
                      <span className="font-medium">More:</span> {row.additionalInfo}
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        ))}
      </div>

      <div className="shrink-0">
        {issued ? (
          <Button variant="ghost" size="sm" onClick={onToggle} disabled={busy}>
            {busy ? "Undoing…" : "Undo"}
          </Button>
        ) : (
          <Button onClick={onToggle} disabled={busy}>
            {busy ? "Saving…" : "Mark badge issued"}
          </Button>
        )}
      </div>
    </li>
  );
}
