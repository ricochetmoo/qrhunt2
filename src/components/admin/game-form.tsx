"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ErrorMessage, Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { Game } from "@/db/types";
import { apiClient } from "@/lib/api-client";
import { readError } from "@/lib/api-errors";
import { COMPLETION_MESSAGE_MAX_LENGTH } from "@/lib/completion";
import {
  GAME_MODES,
  GAME_MODE_DESCRIPTIONS,
  GAME_MODE_LABELS,
  isGameMode,
  type GameMode,
} from "@/lib/game-mode";
import { GAME_STATUSES, GAME_STATUS_LABELS, isGameStatus, type GameStatus } from "@/lib/game-status";

export type EditableGame = Pick<
  Game,
  | "id"
  | "name"
  | "status"
  | "pauseReason"
  | "completionMessage"
  | "feedbackUrl"
  | "gameCode"
  | "gameMode"
  | "allowOutOfOrder"
  | "allowSelfSignup"
  | "allowTeamCreation"
  | "allowTeamNames"
  | "allowTeamPhotos"
  | "routeSignupEnabled"
  | "wildcardEnabled"
  | "wildcardName"
  | "staggeredStart"
  | "qrRemoveBy"
  | "issueContactPhone"
>;

type GameFormProps = { mode: "create" } | { mode: "edit"; game: EditableGame };

type ConfigState = {
  gameMode: GameMode;
  completionMessage: string;
  feedbackUrl: string;
  allowOutOfOrder: boolean;
  allowSelfSignup: boolean;
  allowTeamCreation: boolean;
  allowTeamNames: boolean;
  allowTeamPhotos: boolean;
  routeSignupEnabled: boolean;
  wildcardEnabled: boolean;
  wildcardName: string;
  staggeredStart: boolean;
  qrRemoveBy: string; // value of a datetime-local input, in the admin's local time
  issueContactPhone: string;
};

/** datetime-local wants `YYYY-MM-DDTHH:mm` in local time. */
function toLocalInputValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialConfig(game: EditableGame | null): ConfigState {
  return {
    gameMode: game && isGameMode(game.gameMode) ? game.gameMode : "speed",
    completionMessage: game?.completionMessage ?? "",
    feedbackUrl: game?.feedbackUrl ?? "",
    allowOutOfOrder: game?.allowOutOfOrder ?? false,
    allowSelfSignup: game?.allowSelfSignup ?? true,
    allowTeamCreation: game?.allowTeamCreation ?? true,
    allowTeamNames: game?.allowTeamNames ?? true,
    allowTeamPhotos: game?.allowTeamPhotos ?? false,
    routeSignupEnabled: game?.routeSignupEnabled ?? false,
    wildcardEnabled: game?.wildcardEnabled ?? false,
    wildcardName: game?.wildcardName ?? "",
    staggeredStart: game?.staggeredStart ?? false,
    qrRemoveBy: toLocalInputValue(game?.qrRemoveBy ?? null),
    issueContactPhone: game?.issueContactPhone ?? "",
  };
}

function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-slate-200 pt-4">
      <legend className="pr-3 text-sm font-semibold text-slate-900">{title}</legend>
      {children}
    </fieldset>
  );
}

export function GameForm(props: GameFormProps) {
  const router = useRouter();
  const game = props.mode === "edit" ? props.game : null;

  const [name, setName] = useState(game?.name ?? "");
  const [status, setStatus] = useState<GameStatus>(
    game && isGameStatus(game.status) ? game.status : "draft",
  );
  const [pauseReason, setPauseReason] = useState(game?.pauseReason ?? "");
  const [config, setConfig] = useState<ConfigState>(() => initialConfig(game));
  const [gameCode, setGameCode] = useState(game?.gameCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ConfigState>(key: K) => (value: ConfigState[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      if (props.mode === "create") {
        const response = await apiClient.api.admin.games.$post({ json: { name } });

        if (!response.ok) {
          setError(await readError(response));
          return;
        }

        const { game: created } = await response.json();
        router.push(`/admin/games/${created.id}/edit`);
        return;
      }

      const response = await apiClient.api.admin.games[":gameId"].$patch({
        param: { gameId: props.game.id },
        json: {
          name,
          status,
          pauseReason: status === "paused" ? pauseReason : null,
          completionMessage: config.completionMessage.trim() || null,
          feedbackUrl: config.feedbackUrl.trim() || null,
          gameMode: config.gameMode,
          allowOutOfOrder: config.allowOutOfOrder,
          allowSelfSignup: config.allowSelfSignup,
          allowTeamCreation: config.allowTeamCreation,
          allowTeamNames: config.allowTeamNames,
          allowTeamPhotos: config.allowTeamPhotos,
          routeSignupEnabled: config.routeSignupEnabled,
          wildcardEnabled: config.wildcardEnabled,
          wildcardName: config.wildcardName.trim() || null,
          staggeredStart: config.staggeredStart,
          qrRemoveBy: config.qrRemoveBy ? new Date(config.qrRemoveBy).toISOString() : null,
          issueContactPhone: config.issueContactPhone.trim() || null,
        },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  function handleRegenerateCode() {
    if (props.mode !== "edit") return;
    if (!window.confirm("Issue a new game code? The current code will stop working immediately.")) return;

    setError(null);
    startTransition(async () => {
      const response = await apiClient.api.admin.games[":gameId"]["game-code"].$post({
        param: { gameId: props.game.id },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const { game: updated } = await response.json();
      setGameCode(updated.gameCode);
      router.refresh();
    });
  }

  function handleDelete() {
    if (props.mode !== "edit") return;
    if (!window.confirm(`Delete "${props.game.name}" and all of its QR codes and teams?`)) return;

    setError(null);
    startTransition(async () => {
      const response = await apiClient.api.admin.games[":gameId"].$delete({
        param: { gameId: props.game.id },
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      router.push("/admin/games");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorMessage message={error} />

      <Field label="Name" htmlFor="game-name">
        <Input
          id="game-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
          autoFocus={props.mode === "create"}
        />
      </Field>

      {props.mode === "edit" ? (
        <>
          <Field
            label="Game code"
            htmlFor="game-code"
            hint="Players enter this code to join. Share it at the start; regenerate it if it leaks."
          >
            <div className="flex items-center gap-2">
              <code
                id="game-code"
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-lg tracking-widest text-slate-900"
              >
                {gameCode}
              </code>
              <Button variant="secondary" size="sm" onClick={handleRegenerateCode} disabled={pending}>
                Regenerate
              </Button>
            </div>
          </Field>

          <Field
            label="Status"
            htmlFor="game-status"
            hint="Lifecycle transition rules are not enforced yet; any status can be chosen."
          >
            <Select
              id="game-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as GameStatus)}
            >
              {GAME_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {GAME_STATUS_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          {status === "paused" ? (
            <Field
              label="Pause message"
              htmlFor="game-pause-reason"
              hint="Shown to players while the game is paused, e.g. “Come back to the start”."
            >
              <Textarea
                id="game-pause-reason"
                value={pauseReason}
                onChange={(event) => setPauseReason(event.target.value)}
                maxLength={500}
              />
            </Field>
          ) : null}

          <Section title="Game mode">
            <div className="grid gap-2 sm:grid-cols-2">
              {GAME_MODES.map((mode) => (
                <label
                  key={mode}
                  htmlFor={`cfg-mode-${mode}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 ${
                    config.gameMode === mode ? "border-slate-900 bg-slate-50" : "border-slate-200"
                  }`}
                >
                  <input
                    id={`cfg-mode-${mode}`}
                    type="radio"
                    name="cfg-mode"
                    className="mt-0.5 h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={config.gameMode === mode}
                    onChange={() => set("gameMode")(mode)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-700">
                      {GAME_MODE_LABELS[mode]}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {GAME_MODE_DESCRIPTIONS[mode]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <Toggle
              id="cfg-out-of-order"
              label="Stops can be found in any order"
              hint="When off, players must follow the route in sequence and early finds are rejected. Any order pairs well with Completeness mode."
              checked={config.allowOutOfOrder}
              onChange={set("allowOutOfOrder")}
            />
          </Section>

          <Section title="Players and teams">
            <Toggle
              id="cfg-self-signup"
              label="Players can sign up themselves"
              hint="When off, only administrators can add players to teams."
              checked={config.allowSelfSignup}
              onChange={set("allowSelfSignup")}
            />
            <Toggle
              id="cfg-team-creation"
              label="Players can create teams"
              hint="When off, players can only join teams that already exist."
              checked={config.allowTeamCreation}
              onChange={set("allowTeamCreation")}
              disabled={!config.allowSelfSignup}
            />
            <Toggle
              id="cfg-team-names"
              label="Players can choose a team name"
              checked={config.allowTeamNames}
              onChange={set("allowTeamNames")}
            />
            <Toggle
              id="cfg-team-photos"
              label="Players can upload a team photo"
              checked={config.allowTeamPhotos}
              onChange={set("allowTeamPhotos")}
            />
            <Toggle
              id="cfg-route-signup"
              label="Join by scanning a route QR code"
              hint="Lets players join the game directly from any poster instead of entering the game code."
              checked={config.routeSignupEnabled}
              onChange={set("routeSignupEnabled")}
            />
          </Section>

          <Section title="Wildcard">
            <Toggle
              id="cfg-wildcard"
              label="Wildcard is active"
              hint="An extra object players can scan at any point, outside the route order."
              checked={config.wildcardEnabled}
              onChange={set("wildcardEnabled")}
            />
            {config.wildcardEnabled ? (
              <Field label="Wildcard name" htmlFor="cfg-wildcard-name" hint="How it appears to players.">
                <Input
                  id="cfg-wildcard-name"
                  value={config.wildcardName}
                  onChange={(event) => set("wildcardName")(event.target.value)}
                  maxLength={60}
                  required
                />
              </Field>
            ) : null}
          </Section>

          <Section title="Start and posters">
            <Toggle
              id="cfg-staggered"
              label="Staggered start"
              hint="Teams set off at intervals rather than all at once."
              checked={config.staggeredStart}
              onChange={set("staggeredStart")}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Remove QR codes by"
                htmlFor="cfg-remove-by"
                hint="Printed on posters so the public knows when they will be taken down."
              >
                <Input
                  id="cfg-remove-by"
                  type="datetime-local"
                  value={config.qrRemoveBy}
                  onChange={(event) => set("qrRemoveBy")(event.target.value)}
                />
              </Field>
              <Field
                label="Issue contact phone"
                htmlFor="cfg-phone"
                hint="Public number printed on posters for reporting problems."
              >
                <Input
                  id="cfg-phone"
                  type="tel"
                  value={config.issueContactPhone}
                  onChange={(event) => set("issueContactPhone")(event.target.value)}
                  maxLength={30}
                />
              </Field>
            </div>
          </Section>

          <Section title="Completion">
            <Field
              label="Feedback URL"
              htmlFor="cfg-feedback-url"
              hint="Optional. When set, scanning the finish-line code records the team's completion (for the badge queue) and then sends players here for feedback, instead of the built-in form."
            >
              <Input
                id="cfg-feedback-url"
                type="url"
                value={config.feedbackUrl}
                onChange={(event) => set("feedbackUrl")(event.target.value)}
                maxLength={2048}
                placeholder="https://example.com/feedback"
              />
            </Field>
            <Field
              label="Completion message"
              htmlFor="cfg-completion-message"
              hint={`Shown to a team when it completes the route. Leave blank for the standard congratulations message. Up to ${COMPLETION_MESSAGE_MAX_LENGTH} characters.`}
            >
              <Textarea
                id="cfg-completion-message"
                value={config.completionMessage}
                onChange={(event) => set("completionMessage")(event.target.value)}
                maxLength={COMPLETION_MESSAGE_MAX_LENGTH}
                rows={5}
              />
            </Field>
          </Section>
        </>
      ) : null}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : props.mode === "create" ? "Create game" : "Save changes"}
        </Button>
        {props.mode === "edit" ? (
          <Button variant="danger" onClick={handleDelete} disabled={pending}>
            Delete game
          </Button>
        ) : null}
        {saved ? <span className="text-sm text-green-700">Saved.</span> : null}
      </div>
    </form>
  );
}
