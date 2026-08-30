# QR Hunt

A single Next.js App Router application with a shared Drizzle schema, Neon Postgres, Hono RPC, Zod validation, and Better Auth.

## Setup

Install dependencies with pnpm and create a local environment file:

```bash
pnpm install
cp .env.example .env.local
```

Set `DATABASE_URL` to a Neon Postgres connection string and replace `BETTER_AUTH_SECRET` with a random value of at least 32 characters (use `openssl rand -hex 32`).

Then start the app:

```bash
pnpm dev
```

For the local seeded player screen, run `pnpm db:seed`, put its printed game
code in `NEXT_PUBLIC_PLAYER_GAME_CODE`, keep `MOCK_PLAYER_EMAIL` set to a
seeded player such as `foxes-dex@seed.local`, and restart `pnpm dev`. The mock
identity bypass is development-only; production still requires a Better Auth
session.

The Hono API is mounted at `/api`, with a smoke-test endpoint at `/api/health` and a validated example endpoint at `/api/echo`. Better Auth is mounted at `/api/auth/*`.

## Project structure

- `src/db/schema.ts` contains the Drizzle tables and inferred types; import browser-safe types from `src/db/types.ts`.
- `src/db/index.ts` creates the server-only Neon/Drizzle instance.
- `src/server/api.ts` defines the Hono app and exports `AppType` for typed RPC clients.
- `src/app/api/[[...route]]/route.ts` adapts Hono to Next.js Route Handlers.
- `src/lib/auth.ts` contains the Better Auth server configuration.
- `src/lib/auth-client.ts` contains the browser auth client.

## Database Migration
If you are migrating to a fresh database, you need to run

```bash
pnpm db:generate
pnpm db:migrate
```

for the initial schema migration before starting the app.

fucking deploy already
