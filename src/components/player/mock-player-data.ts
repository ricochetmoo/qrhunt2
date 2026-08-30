export type GameStatus = "started" | "paused" | "finished";

export type ScanOutcome =
  | "accepted"
  | "duplicate"
  | "out_of_order"
  | "invalid"
  | "paused"
  | "completed";

export type ScanSource = "camera" | "manual";

export interface RouteCheckpoint {
  id: string;
  index: number;
  name: string;
  hint: string;
  code: string;
  latitude: number;
  longitude: number;
}

export interface TeamSummary {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  progress: number;
  colour: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  progress: number;
  position: number;
  colour: string;
  isCurrentTeam?: boolean;
}

export interface PlayerState {
  gameId: string;
  gameName: string;
  troopName: string;
  status: GameStatus;
  pauseMessage?: string;
  serverTime: string;
  progress: number;
  routeTotal: number;
  nextLocation: RouteCheckpoint | null;
  completedCodes: string[];
  team: TeamSummary;
  leaderboard: LeaderboardEntry[];
  mapBoundary: string;
}

export interface PendingScan {
  idempotencyKey: string;
  code: string;
  source: ScanSource;
  capturedAt: string;
  queuedAt: string;
  attempts: number;
}

export interface ScanSyncResult {
  outcome: ScanOutcome;
  message: string;
  detail: string;
  idempotencyKey: string;
  state: PlayerState;
}

export const MOCK_ROUTE: RouteCheckpoint[] = [
  {
    id: "checkpoint-01",
    index: 0,
    name: "Old Oak",
    hint: "Start where the oldest branches reach over the path.",
    code: "OAK7M2Q4",
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    id: "checkpoint-02",
    index: 1,
    name: "Signal Hill",
    hint: "Look for the high ground and the view beyond the treeline.",
    code: "HILL4P8X",
    latitude: 51.5086,
    longitude: -0.1262,
  },
  {
    id: "checkpoint-03",
    index: 2,
    name: "Foxglove Bend",
    hint: "Where the trail bends, find colour hiding close to the ground.",
    code: "FOX2K9RD",
    latitude: 51.5094,
    longitude: -0.1249,
  },
  {
    id: "checkpoint-04",
    index: 3,
    name: "Moorland Gate",
    hint: "The next signal is waiting where the path opens into the moor.",
    code: "MOOR6N3B",
    latitude: 51.5102,
    longitude: -0.1234,
  },
  {
    id: "checkpoint-05",
    index: 4,
    name: "Ranger’s Rest",
    hint: "Pause under cover and trace the route towards the quiet clearing.",
    code: "REST8V1C",
    latitude: 51.5111,
    longitude: -0.1218,
  },
  {
    id: "checkpoint-06",
    index: 5,
    name: "The Clearing",
    hint: "Your next marker is where the sky gets bigger than the trees.",
    code: "CLEAR5T7",
    latitude: 51.5122,
    longitude: -0.1204,
  },
  {
    id: "checkpoint-07",
    index: 6,
    name: "North Star",
    hint: "Face north and follow the brightest trail marker ahead.",
    code: "STAR3J6P",
    latitude: 51.5131,
    longitude: -0.1188,
  },
  {
    id: "checkpoint-08",
    index: 7,
    name: "Campfire",
    hint: "The final signal is close. Bring your team back to camp.",
    code: "CAMP9W2L",
    latitude: 51.5142,
    longitude: -0.1173,
  },
];

const INITIAL_PROGRESS = 3;

export function createInitialPlayerState(): PlayerState {
  const team: TeamSummary = {
    id: "team-foxes",
    name: "The Foxes",
    code: "FOX-274",
    memberCount: 4,
    progress: INITIAL_PROGRESS,
    colour: "orange",
  };

  return {
    gameId: "game-north-star",
    gameName: "The Lost Signal",
    troopName: "North Star Troop",
    status: "started",
    serverTime: "2026-08-30T14:12:00.000Z",
    progress: INITIAL_PROGRESS,
    routeTotal: MOCK_ROUTE.length,
    nextLocation: MOCK_ROUTE[INITIAL_PROGRESS] ?? null,
    completedCodes: MOCK_ROUTE.slice(0, INITIAL_PROGRESS).map(
      (checkpoint) => checkpoint.code,
    ),
    team,
    mapBoundary: "North trail · 1.8 km loop",
    leaderboard: [
      {
        id: "team-ravens",
        name: "The Ravens",
        progress: 5,
        position: 1,
        colour: "purple",
      },
      {
        id: team.id,
        name: team.name,
        progress: team.progress,
        position: 2,
        colour: team.colour,
        isCurrentTeam: true,
      },
      {
        id: "team-badgers",
        name: "The Badgers",
        progress: 2,
        position: 3,
        colour: "teal",
      },
      {
        id: "team-owls",
        name: "The Owls",
        progress: 1,
        position: 4,
        colour: "blue",
      },
    ],
  };
}

const processedIdempotencyKeys = new Set<string>();

function makeUpdatedState(state: PlayerState, progress: number): PlayerState {
  const nextLocation = MOCK_ROUTE[progress] ?? null;
  const team = { ...state.team, progress };
  const leaderboard = state.leaderboard
    .map((entry) =>
      entry.id === team.id ? { ...entry, progress } : { ...entry },
    )
    .sort((a, b) => b.progress - a.progress)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  return {
    ...state,
    status: nextLocation ? "started" : "finished",
    progress,
    nextLocation,
    completedCodes: MOCK_ROUTE.slice(0, progress).map(
      (checkpoint) => checkpoint.code,
    ),
    team,
    leaderboard,
  };
}

export function normalizePlayerCode(value: string): string {
  const trimmed = value.trim().toUpperCase();
  const prefix = "QRHUNT:V1:";
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

export async function mockSyncScan(
  scan: PendingScan,
  state: PlayerState,
): Promise<ScanSyncResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 420));

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("offline");
  }

  if (processedIdempotencyKeys.has(scan.idempotencyKey)) {
    return {
      outcome: "duplicate",
      message: "Already synced",
      detail: "This scan was already recorded. Your progress is unchanged.",
      idempotencyKey: scan.idempotencyKey,
      state,
    };
  }

  if (state.status === "paused") {
    return {
      outcome: "paused",
      message: "Game paused",
      detail: state.pauseMessage ?? "Scanning will be available again shortly.",
      idempotencyKey: scan.idempotencyKey,
      state,
    };
  }

  if (state.status === "finished" || state.progress >= MOCK_ROUTE.length) {
    return {
      outcome: "completed",
      message: "Route complete",
      detail: "You found every signal. Nice work, Foxes.",
      idempotencyKey: scan.idempotencyKey,
      state,
    };
  }

  const scannedCheckpoint = MOCK_ROUTE.find(
    (checkpoint) => checkpoint.code === normalizePlayerCode(scan.code),
  );

  if (!scannedCheckpoint) {
    return {
      outcome: "invalid",
      message: "Code not recognised",
      detail: "Check the code and try again. Your next signal is still waiting.",
      idempotencyKey: scan.idempotencyKey,
      state,
    };
  }

  if (scannedCheckpoint.index < state.progress) {
    return {
      outcome: "duplicate",
      message: "Already found",
      detail: "Your team has already visited this signal.",
      idempotencyKey: scan.idempotencyKey,
      state,
    };
  }

  if (scannedCheckpoint.index > state.progress) {
    return {
      outcome: "out_of_order",
      message: "Not the next signal",
      detail: "Follow the hint and scan the route in order.",
      idempotencyKey: scan.idempotencyKey,
      state,
    };
  }

  processedIdempotencyKeys.add(scan.idempotencyKey);
  const updatedState = makeUpdatedState(state, state.progress + 1);

  return {
    outcome: "accepted",
    message: updatedState.nextLocation
      ? `${scannedCheckpoint.name} found`
      : "Route complete",
    detail: updatedState.nextLocation
      ? `Next up: ${updatedState.nextLocation.name}.`
      : "You found every signal. Nice work, Foxes.",
    idempotencyKey: scan.idempotencyKey,
    state: updatedState,
  };
}
