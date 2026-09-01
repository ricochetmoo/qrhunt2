<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# QR Hunt agent context

## Product purpose

QR Hunt is a mobile-first route game for Scouts UK. Players join a game, form
teams, scan QR codes in sequence to reveal hints, and compete on a leaderboard.
Game administrators configure routes, monitor live progress, manage the game
lifecycle, and generate branded QR-code posters.

The product brief this context is derived from is the [Scouts QR Hunt Notion
page](https://app.notion.com/p/3cc8dead97a480efb119f9a08f1d6f36). It was fetched
on 2026-08-30. Treat newer product decisions as authoritative when they conflict
with this document.

This is shared context for agents working in parallel across the repository. It
is not a request to implement the whole brief in one task. Treat the sections
below as product vocabulary, contracts, constraints, and known gaps; implement
only the slice requested by the current task.

## Current repository baseline

This repository is a working foundation, not a completed implementation of the
brief:

- A single Next.js App Router application lives under `src/app`.
- The stack is Next.js, React, Tailwind CSS, Hono, Zod, Drizzle ORM, Neon
  Postgres, and Better Auth, managed with pnpm.
- Hono is mounted at `/api` through
  `src/app/api/[[...route]]/route.ts`. Existing custom routes are `GET
  /api/health`, `GET /api/me`, and `POST /api/echo`.
- Better Auth is mounted at `/api/auth/*` and is configured for email/password
  plus anonymous sign-in. Keep authentication behavior in Better Auth rather
  than duplicating auth endpoints in Hono.
- `src/db/schema.ts` currently contains Better Auth tables and inferred types;
  QR Hunt domain tables do not exist yet. The initial migration should be
  checked and regenerated when the schema changes; in particular, the current
  TypeScript schema and committed migration are not identical.
- `src/app/page.tsx` is a starter landing page. Player, admin, route-editor,
  dashboard, and PDF workflows still need to be built.

## Engineering conventions

- Read the relevant current Next.js guidance under
  `node_modules/next/dist/docs/` before changing Next.js code. The Next.js
  version in this repo may have APIs or conventions that differ from prior
  versions.
- Never use em dashes (—) in user-facing copy (UI text, error messages,
  labels, PDF content). Use a plain hyphen (-) instead, or reword the
  sentence. Code comments are exempt.
- Keep database access and Better Auth server-only. Do not import `src/db` or
  `src/lib/auth` into browser components; use browser-safe types from
  `src/db/types.ts`.
- Put custom HTTP behavior in the Hono app, validate request input with Zod,
  and preserve the typed `AppType`/`apiClient` relationship.
- Enforce authorization, game-state rules, scan ordering, and idempotency on
  the server. Client checks are for UX only.
- Add Drizzle migrations for schema changes and keep the schema, migration, and
  inferred types in sync. Do not hand-edit generated migration history unless
  the migration workflow requires it.
- Prefer small, composable domain services for lifecycle transitions, team
  membership, route progress, and scan synchronization so the same rules are
  used by player and admin endpoints.
- Preserve existing user changes and the generated Next.js instruction block
  at the top of this file.

## Working in a multi-developer repository

- Start by inspecting the current working tree and the code that owns the task.
  Existing changes may belong to another developer; preserve them and avoid
  broad formatting or opportunistic refactors.
- Keep changes narrow and reviewable. Do not build unrelated product areas just
  because they are listed in this context file.
- Before changing shared contracts—database schema, migrations, API response
  shapes, auth behavior, or shared types—look for existing consumers and keep
  compatibility in mind. Call out intentional contract changes in the handoff.
- Prefer additive, independently testable slices. If a feature is incomplete,
  leave a clear boundary rather than adding speculative behavior for an
  adjacent feature.
- Record important product or technical decisions in the relevant code/docs and
  mention them in the final handoff. Do not silently resolve an item listed in
  “Open decisions” when it changes user-visible behavior.
- Verify the narrowest useful checks for the files touched (for example lint,
  typecheck, migration generation, or a focused test). Report checks that could
  not run and why.
- When handing off, summarize what changed, what remains intentionally out of
  scope, any migration or environment steps, and the next useful seam for
  another developer.

## Product model

### Game lifecycle

Games have these states. The state and its effects must be validated on every
relevant server operation:

- `draft`: players cannot join a team.
- `published`: teams can join, but players do not yet receive a first hint.
- `started`: the game is active.
- `paused`: players cannot scan or enter codes. A game may expose an optional
  pause message, such as “Come back to the start”.
- `finished`: the game is complete but remains viewable.
- `archived`: players cannot view the game; administrators can duplicate it.

The brief requires validated transitions between lifecycle states, but does not
define the complete transition matrix. Make the matrix explicit in domain code
before adding admin lifecycle controls; do not silently allow arbitrary status
changes.

### People, teams, and access

- Administrators manage games through Better Auth and B2C/SSO. A game has
  administrator memberships and may have invitation records for additional
  administrators.
- Players use Better Auth anonymous sign-in. A player can create a team or join
  an existing team, receive a team-join code, set a team name when enabled, and
  upload a team photo when enabled.
- A player can enter a randomly generated game code or scan a route QR code to
  join. Route-based self-sign-up is configurable per game.
- Keep game membership and team membership separate. A user may belong to a
  team only through a team membership, and admin access must be checked against
  the game being accessed.

### Routes, QR codes, and scans

- A game has an ordered route containing locations, human-readable names,
  hints, and QR codes. Codes are random eight-character base62 strings.
- A player advances only by scanning or entering the next QR code in order.
  Duplicate, out-of-order, invalid, wildcard, paused, and late-arriving scans
  need distinct server outcomes rather than being treated as a generic success
  or failure.
- A wildcard is an optional game-level feature: its active state and display
  name are configurable, and its QR object can be scanned independently of the
  ordered route rules.
- Each QR code may have a map location. The game map shows configured
  boundaries; admin views may also show each team’s last scan location.
- Players need the complete route bundle on-device for offline play. Scans
  collected offline must be queued locally and synchronized when connectivity
  returns. Synchronization must be idempotent and must reapply authoritative
  ordering/state rules on the server.

## Required user experiences

### Player frontend

Build a mobile experience that supports:

- joining by scanning a route QR code or entering a game code;
- creating or joining a team, setting the team name/photo where allowed, and
  sharing a team code with other devices;
- scanning QR codes or manually entering their human-readable codes;
- displaying the next hint only after valid in-order progress;
- displaying game status, pause messaging, current time, map boundaries, team
  progress, and the leaderboard;
- scanning an optional wildcard object; and
- downloading the route for offline progress and syncing scans later.

QuaggaJS was suggested in the brief for barcode scanning; evaluate its current
browser/device fit before adopting it and keep manual code entry available.

### Admin in-game frontend

Administrators need to see all teams, each team’s progress, and the latest scan
including when and where it happened.

### Admin configuration frontend

Per-game configuration must support:

- whether players can self-sign up and create teams;
- whether players can choose team names and upload photos;
- whether route-based sign-up is enabled;
- whether the wildcard is active and what it is called;
- whether the game is started and whether players are staggered at the start;
- the time at which QR codes should be removed; and
- a public issue-reporting phone number shown on posters.

The route configuration should provide a visual drag-and-drop editor for the
ordered route. Administrators can add code names, hints, locations, map
boundaries, and QR settings; locations should feed the game map automatically.

### QR poster PDFs

Generate a set of Scouts UK-branded PDFs containing the QR codes, each code’s
human-readable value, the take-down-by time, and the issue contact phone number.
Keep branding/assets and PDF layout concerns isolated from game/scan business
logic.

## Proposed data model

Use Postgres via Drizzle. The brief proposes these domain tables:

- `games`: identity, game code, lifecycle status, configuration, map boundary,
  timestamps, and duplication/archive metadata as needed;
- `game_admins`: which authenticated administrators can manage each game;
- `teams`: game teams, team code, name, photo, and progress-related metadata;
- `team_memberships`: anonymous Better Auth users in teams;
- `qr_codes`: ordered route codes, human-readable values, hints, names,
  locations, wildcard settings, and removal metadata;
- `scans`: submitted scan events, team/player identity, QR code, client/server
  timestamps, location, sync metadata, and the authoritative result;
- `invitations`: optional administrator invitations and their acceptance state;
- Better Auth tables: owned and managed by Better Auth/its Drizzle adapter.

Choose explicit foreign keys, uniqueness constraints, indexes, and status enums
around the invariants above. Resolve the scoring model, team size rules, scan
event retention, and offline conflict policy before relying on them in the UI.

## Minimal custom API contract

The brief calls for 13 operations across 12 route patterns. Keep aggregate
responses together where possible so maps, time, leaderboards, progress,
wildcard validation, and next-hint state do not require separate round trips.

| Area | Method | Endpoint | Purpose |
| --- | --- | --- | --- |
| Player | `POST` | `/api/player/join` | Join by game code or QR payload; validate game state and route-sign-up rules. |
| Player | `GET` | `/api/player/games/:gameId/state` | Return status, pause message, server time, map boundaries, offline route bundle, team, progress, next hint, and leaderboard. |
| Player | `POST` | `/api/player/games/:gameId/team` | Create a team or join one with a team code; return or generate the team code. |
| Player | `PATCH` | `/api/player/teams/:teamId` | Update team name and photo. |
| Player | `POST` | `/api/player/games/:gameId/scans/sync` | Submit online/offline scans; handle ordering, wildcard scans, paused games, duplicates, and next-hint calculation. |
| Admin | `GET` | `/api/admin/games` | List games the administrator can manage. |
| Admin | `POST` | `/api/admin/games` | Create a game and generate its game code. |
| Admin | `GET` | `/api/admin/games/:gameId/dashboard` | Return teams, progress, latest scans, scan locations, configuration, and status. |
| Admin | `PATCH` | `/api/admin/games/:gameId` | Update settings and perform validated lifecycle transitions. |
| Admin | `PUT` | `/api/admin/games/:gameId/route` | Bulk-save ordered route, hints, locations, map boundary, QR settings, and generated QR codes. |
| Admin | `POST` | `/api/admin/games/:gameId/invitations` | Invite another administrator. |
| Admin | `POST` | `/api/invitations/:token/accept` | Accept an administrator invitation. |
| Admin | `POST` | `/api/admin/games/:gameId/poster-pdf` | Generate and return the Scouts-branded QR poster PDF set. |

Better Auth owns anonymous sign-in, B2C/SSO login, sessions, and its available
authentication endpoints. Do not add custom replacements for those operations.

## Invariants to protect

- Game codes, team codes, and route QR codes are unguessable and unique within
  their intended scope; never trust a client-provided game/team identity.
- A player can read or mutate only games and teams they are authorized to use.
- Lifecycle status gates joining, scanning, viewing, archiving, and duplication.
- Ordered progress is evaluated server-side against the route version in force;
  retries and offline replay must not award progress twice.
- Every accepted scan has enough timestamps and identity metadata to explain
  what happened in the admin dashboard.
- Aggregate state returned to the player is consistent: next hint, progress,
  leaderboard, status, and offline route data must describe the same game state.
- Admin-only configuration and PDF generation must never be exposed through
  player endpoints.

## Suggested decomposition for parallel work

Use independently reviewable seams such as:

- domain schema, migrations, and shared browser-safe types;
- authorization and lifecycle policy;
- player join/team/state APIs and UI;
- scan validation, ordering, and offline synchronization;
- admin configuration and dashboard APIs/UI;
- route editor and map integration;
- scanner/manual-entry and offline client storage; and
- branded poster PDF generation.

These are coordination hints, not a mandated delivery sequence. Avoid having
multiple agents edit the same shared contract simultaneously; agree on the
interface first, then keep each implementation slice focused on its owner.

## Open decisions

The brief leaves these details open. Keep them explicit rather than inventing
product behavior in individual endpoints or components:

- exact allowed lifecycle transitions and who may perform each one;
- team size limits, team-code rotation, and what happens when a team is full;
- scoring and leaderboard tie-breaking;
- whether offline route data includes all hints or only data unlocked so far;
- how offline scans are ordered, rejected, audited, and reconciled after a
  route/configuration change;
- QR payload format/version and wildcard precedence;
- map-boundary format and whether the map is embedded, linked, or rendered from
  stored geometry;
- B2C/SSO provider details and administrator invitation expiry/permissions;
- Scouts UK branding assets, PDF page/layout requirements, and QR removal
  enforcement; and
- privacy, retention, and consent requirements for anonymous users, uploaded
  team photos, scan locations, and public contact details.
