"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ErrorMessage, Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { Game } from "@/db/types";
import { apiClient } from "@/lib/api-client";
import { readError } from "@/lib/api-errors";
import { GAME_STATUSES, GAME_STATUS_LABELS, isGameStatus, type GameStatus } from "@/lib/game-status";

type GameFormProps =
  | { mode: "create" }
  | { mode: "edit"; game: Pick<Game, "id" | "name" | "status" | "pauseReason"> };

export function GameForm(props: GameFormProps) {
  const router = useRouter();
  const game = props.mode === "edit" ? props.game : null;

  const [name, setName] = useState(game?.name ?? "");
  const [status, setStatus] = useState<GameStatus>(
    game && isGameStatus(game.status) ? game.status : "draft",
  );
  const [pauseReason, setPauseReason] = useState(game?.pauseReason ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

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
        router.push(`/admin/games/${created.id}`);
        return;
      }

      const response = await apiClient.api.admin.games[":gameId"].$patch({
        param: { gameId: props.game.id },
        json: {
          name,
          status,
          pauseReason: status === "paused" ? pauseReason : null,
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
        </>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
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
