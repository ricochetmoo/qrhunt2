import { ErrorMessage } from "@/components/ui/field";
import {
  HeaderBar,
  ScoutsHeader,
  ScoutsNavigation,
  Spinner,
} from "@/components/ui";
import { cn } from "@/lib/cn";

export type PlayerPage = "game" | "history" | "hints" | "help";

const PLAYER_NAVIGATION: readonly {
  page: PlayerPage;
  label: string;
  path?: string;
}[] = [
  { page: "game", label: "Game" },
  { page: "history", label: "History", path: "history" },
  { page: "hints", label: "All Hints", path: "hints" },
  { page: "help", label: "Help", path: "help" },
];

export function PlayerPageHeader({
  gameId,
  gameName,
  activePage,
}: {
  gameId: string;
  gameName?: string | null;
  activePage: PlayerPage;
}) {
  return (
    <div>
      <ScoutsHeader title="QR Hunt" subtitle={gameName ?? null} logo />
      <HeaderBar level={1}>
        <ScoutsNavigation
          label="Game navigation"
          items={PLAYER_NAVIGATION.map(({ page, label, path }) => ({
            href: path ? `/play/${gameId}/${path}` : `/play/${gameId}`,
            label,
            current: page === activePage,
          }))}
        />
      </HeaderBar>
    </div>
  );
}

export function PlayerPageLoading({
  gameId,
  activePage,
  label,
  error,
  className,
}: {
  gameId: string;
  activePage: PlayerPage;
  label: string;
  error?: string | null;
  className?: string;
}) {
  return (
    <>
      <PlayerPageHeader gameId={gameId} activePage={activePage} />
      <main
        className={cn(
          "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-6 pt-6",
          className,
        )}
      >
        <ErrorMessage message={error ?? null} />
        <div className="flex min-h-48 items-center justify-center">
          <Spinner label={label} size="lg" />
        </div>
      </main>
    </>
  );
}
