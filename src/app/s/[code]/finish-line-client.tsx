"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ErrorMessage, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { readError } from "@/lib/api-errors";
import { FUN_SCORE_MAX, FUN_SCORE_MIN } from "@/lib/player-schemas";

/**
 * The finish line: what the `/s/<code>` page shows when the scanned code is a
 * game's "I'm done" code. Enrolled players with a complete route fill in the
 * fun score and comments (the gate), optionally opt in to keep-updated
 * details, and are checked in for a badge. Everyone else is told why not.
 */

type Viewer = {
  signedIn: boolean;
  named: boolean;
  name: string | null;
  enrolled: boolean;
};

type Phase =
  | { kind: "loading" }
  | { kind: "not-playing" }
  | { kind: "incomplete"; found: number; total: number }
  | { kind: "form" }
  | { kind: "done"; reportedAt: string | null; prizeIssuedAt: string | null; already: boolean }
  | { kind: "error"; message: string };

const timeFormat = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" });

const SCORES = Array.from({ length: FUN_SCORE_MAX - FUN_SCORE_MIN + 1 }, (_, i) => FUN_SCORE_MIN + i);

export function FinishLine({
  code,
  game,
  viewer,
}: {
  code: string;
  game: { id: string; name: string };
  viewer: Viewer | undefined;
}) {
  const enrolled = Boolean(viewer?.signedIn && viewer.enrolled);
  const [phase, setPhase] = useState<Phase>(enrolled ? { kind: "loading" } : { kind: "not-playing" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [funScore, setFunScore] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [keepUpdated, setKeepUpdated] = useState(false);
  const [contactName, setContactName] = useState(viewer?.name ?? "");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const load = useCallback(async () => {
    // No state updates before the first await: this runs from an effect.
    try {
      const response = await apiClient.api.player.games[":gameId"].state.$get({
        param: { gameId: game.id },
      });

      if (!response.ok) {
        setPhase({ kind: "not-playing" });
        return;
      }

      const { state } = await response.json();

      if (state.team?.reportedCompletedAt) {
        setPhase({
          kind: "done",
          reportedAt: state.team.reportedCompletedAt,
          prizeIssuedAt: state.team.prizeIssuedAt,
          already: true,
        });
        return;
      }

      if (!state.progress?.complete) {
        setPhase({
          kind: "incomplete",
          found: state.progress?.found ?? 0,
          total: state.progress?.total ?? 0,
        });
        return;
      }

      const feedbackUrl = state.game.feedbackUrl?.trim();

      if (feedbackUrl) {
        window.location.replace(feedbackUrl);
        return;
      }

      setPhase({ kind: "form" });
    } catch {
      setPhase({
        kind: "error",
        message: "Could not reach the game. Check your signal and try again.",
      });
    }
  }, [game.id]);

  useEffect(() => {
    // Fetch-on-mount: state updates land after the network await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enrolled) void load();
  }, [enrolled, load]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (funScore === null || !comments.trim()) return;

    setError(null);
    setBusy(true);

    try {
      const response = await apiClient.api.player.games[":gameId"].complete.$post({
        param: { gameId: game.id },
        json: {
          code,
          funScore,
          comments: comments.trim(),
          keepUpdated,
          contactName: keepUpdated ? contactName.trim() || null : null,
          contactEmail: keepUpdated ? contactEmail.trim() || null : null,
          contactRole: keepUpdated ? contactRole.trim() || null : null,
          additionalInfo: keepUpdated ? additionalInfo.trim() || null : null,
        },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const { state } = await response.json();
      setPhase({
        kind: "done",
        reportedAt: state.team?.reportedCompletedAt ?? null,
        prizeIssuedAt: state.team?.prizeIssuedAt ?? null,
        already: false,
      });
    } catch {
      setError("Could not reach the game. Check your signal and try again.");
    } finally {
      setBusy(false);
    }
  }

  const firstName = viewer?.name ? `, ${viewer.name}` : "";

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-green-700">Finish line</p>
          <h1 className="text-xl font-semibold text-slate-900">{game.name}</h1>
        </div>

        <ErrorMessage message={error} />

        {phase.kind === "loading" ? (
          <p className="text-sm text-slate-500">Checking your hunt…</p>
        ) : null}

        {phase.kind === "error" ? (
          <>
            <p className="text-sm text-slate-700">{phase.message}</p>
            <Button variant="secondary" onClick={load} className="w-full">
              Try again
            </Button>
          </>
        ) : null}

        {phase.kind === "not-playing" ? (
          <>
            <p className="text-sm text-slate-700">
              This is the finish-line code for teams who have completed the hunt. Scan a poster on
              the route to start playing, or use your rejoin code if you switched phones.
            </p>
            <Link href="/" className="block text-sm font-medium underline">
              Go to the start page
            </Link>
          </>
        ) : null}

        {phase.kind === "incomplete" ? (
          <>
            <h2 className="text-lg font-semibold text-slate-900">Not quite yet{firstName}!</h2>
            <p className="text-sm text-slate-700">
              You&apos;ve found <strong>{phase.found}</strong> of <strong>{phase.total}</strong>{" "}
              stops. Come back and scan this code once you&apos;ve found them all.
            </p>
            <a
              href={`/play/${game.id}`}
              className="block w-full rounded-md bg-slate-900 px-3.5 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
            >
              Back to your game →
            </a>
          </>
        ) : null}

        {phase.kind === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">🏁 You made it{firstName}!</h2>
              <p className="mt-1 text-sm text-slate-600">
                Before we check you in for your badge, tell us how it went.
              </p>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">How much fun was it?</legend>
              <p className="mt-0.5 text-xs text-slate-500">
                {FUN_SCORE_MIN} = not much, {FUN_SCORE_MAX} = the best
              </p>
              <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Fun score">
                {SCORES.map((score) => {
                  const selected = funScore === score;

                  return (
                    <button
                      key={score}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setFunScore(score)}
                      className={`h-11 rounded-md border text-base font-semibold transition ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <Field
              label="Your thoughts"
              htmlFor="finish-comments"
              hint="How was the hunt? And what would you like to see, add or change in the world of Scouts Digital?"
            >
              <Textarea
                id="finish-comments"
                value={comments}
                onChange={(event) => setComments(event.target.value)}
                required
                maxLength={2000}
                rows={4}
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={keepUpdated}
                onChange={(event) => setKeepUpdated(event.target.checked)}
              />
              <span className="text-sm text-slate-700">
                Keep me updated about future hunts and what the Digital Team is up to
                <span className="block text-xs text-slate-500">
                  Optional. We&apos;ll only use these details to keep you updated.
                </span>
              </span>
            </label>

            {keepUpdated ? (
              <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <Field label="Name" htmlFor="finish-name">
                  <Input
                    id="finish-name"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    maxLength={120}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Email" htmlFor="finish-email">
                  <Input
                    id="finish-email"
                    type="email"
                    inputMode="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    required={keepUpdated}
                    maxLength={254}
                    autoComplete="email"
                  />
                </Field>
                <Field label="Your role" htmlFor="finish-role" hint="e.g. Leader, Scout, Parent">
                  <Input
                    id="finish-role"
                    value={contactRole}
                    onChange={(event) => setContactRole(event.target.value)}
                    maxLength={120}
                  />
                </Field>
                <Field label="Anything else?" htmlFor="finish-more">
                  <Textarea
                    id="finish-more"
                    value={additionalInfo}
                    onChange={(event) => setAdditionalInfo(event.target.value)}
                    maxLength={2000}
                    rows={3}
                  />
                </Field>
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={busy || funScore === null || !comments.trim()}
            >
              {busy ? "Checking you in…" : "Check in"}
            </Button>
          </form>
        ) : null}

        {phase.kind === "done" ? (
          <>
            <div
              aria-hidden="true"
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700"
            >
              ✓
            </div>
            <h2 className="text-center text-lg font-semibold text-slate-900">
              {phase.already ? `You're already checked in${firstName}` : `You're checked in${firstName}!`}
            </h2>
            {phase.prizeIssuedAt ? (
              <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center text-sm text-green-900">
                🎖 Badge issued at {timeFormat.format(new Date(phase.prizeIssuedAt))}. Thanks for
                playing!
              </p>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
                Show this screen to the Digital Team to collect your badge.
                {phase.reportedAt ? ` Checked in at ${timeFormat.format(new Date(phase.reportedAt))}.` : ""}
              </p>
            )}
            <a
              href={`/play/${game.id}`}
              className="block w-full rounded-md bg-slate-900 px-3.5 py-2 text-center text-sm font-medium text-white hover:bg-slate-700"
            >
              Back to your game →
            </a>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
