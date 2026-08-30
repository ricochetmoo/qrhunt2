import "server-only";

import type { GameStatus } from "@/lib/game-status";

/**
 * Lifecycle transition policy.
 *
 * TODO(open decision): the brief requires validated transitions but does not
 * define the matrix or who may perform each one (see AGENTS.md "Open
 * decisions"). Until that is settled, the admin UI may set any status. Put the
 * matrix here so both admin and player endpoints share it.
 */
export function canTransition(from: GameStatus, to: GameStatus): boolean {
  void from;
  void to;
  return true;
}
