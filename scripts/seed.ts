import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { like } from "drizzle-orm";

import * as schema from "../src/db/schema";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (expected in .env.local)");
}

const db = drizzle({ client: neon(databaseUrl), schema });

// Everything the seed creates is tagged so a re-run can wipe only its own rows.
const SEED_GAME_PREFIX = "Seed:";
const SEED_EMAIL_DOMAIN = "@seed.local";

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function routeCode(): string {
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return out;
}

const GAME_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function gameCode(): string {
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += GAME_CODE_ALPHABET[Math.floor(Math.random() * GAME_CODE_ALPHABET.length)];
  }
  return out;
}

const ROUTE: Array<{ name: string; hint: string; lat: string; lng: string }> = [
  { name: "The Old Oak", hint: "Start where the widest branches meet the path.", lat: "51.5072", lng: "-0.1276" },
  { name: "Bandstand", hint: "Music once played where the roof has eight sides.", lat: "51.5081", lng: "-0.1290" },
  { name: "Boating Lake", hint: "Follow the water to the jetty with the blue rowboats.", lat: "51.5095", lng: "-0.1305" },
  { name: "War Memorial", hint: "Names in stone face the rising sun.", lat: "51.5103", lng: "-0.1288" },
  { name: "Rose Garden Gate", hint: "Iron petals frame the entrance to the scented beds.", lat: "51.5110", lng: "-0.1270" },
  { name: "The Pavilion", hint: "Cricketers take tea behind the long white balcony.", lat: "51.5118", lng: "-0.1255" },
  { name: "Fountain Court", hint: "Three tiers of water, one very wet statue.", lat: "51.5126", lng: "-0.1242" },
  { name: "North Lodge", hint: "The finish waits at the smallest house with the tallest chimney.", lat: "51.5134", lng: "-0.1229" },
];

const TEAMS: Array<{ name: string; players: string[]; progress: number }> = [
  { name: "Kestrels", players: ["Ada", "Ben", "Cora"], progress: 6 },
  { name: "Foxes", players: ["Dex", "Elle"], progress: 4 },
  { name: "Badgers", players: ["Finn", "Gwen", "Hugo", "Ivy"], progress: 2 },
];

const BASE_TIME = new Date("2026-08-30T09:00:00.000Z").getTime();
const minutes = (n: number) => new Date(BASE_TIME + n * 60_000);

async function wipePreviousSeed() {
  await db.delete(schema.games).where(like(schema.games.name, `${SEED_GAME_PREFIX}%`));
  await db.delete(schema.user).where(like(schema.user.email, `%${SEED_EMAIL_DOMAIN}`));
}

async function seed() {
  await wipePreviousSeed();

  const adminId = randomUUID();
  await db.insert(schema.user).values({
    id: adminId,
    name: "Sam Warden",
    email: `admin${SEED_EMAIL_DOMAIN}`,
    emailVerified: true,
  });

  const gameId = randomUUID();
  await db.insert(schema.games).values({
    id: gameId,
    name: `${SEED_GAME_PREFIX} Autumn Trail`,
    status: "started",
    gameCode: gameCode(),
  });

  await db.insert(schema.game_admins).values({
    id: randomUUID(),
    gameId,
    userId: adminId,
  });

  const qrCodeIds: string[] = [];
  for (const [index, stop] of ROUTE.entries()) {
    const id = randomUUID();
    qrCodeIds.push(id);
    const at = minutes(index);
    await db.insert(schema.qr_codes).values({
      id,
      name: stop.name,
      hint: stop.hint,
      latitude: stop.lat,
      longitude: stop.lng,
      code: routeCode(),
      sortOrder: index,
      gameId,
      createdAt: at,
      updatedAt: at,
    });
  }

  for (const team of TEAMS) {
    const teamId = randomUUID();
    await db.insert(schema.teams).values({ id: teamId, name: team.name, gameId, teamCode: joinCode() });

    const memberIds: string[] = [];
    for (const player of team.players) {
      const id = randomUUID();
      memberIds.push(id);
      await db.insert(schema.user).values({
        id,
        name: player,
        email: `${team.name.toLowerCase()}-${player.toLowerCase()}${SEED_EMAIL_DOMAIN}`,
        isAnonymous: true,
      });
      await db.insert(schema.team_memberships).values({ id: randomUUID(), teamId, userId: id });
    }

    for (let stop = 0; stop < team.progress; stop += 1) {
      const at = minutes(15 + stop * 12 + TEAMS.indexOf(team) * 3);
      await db.insert(schema.qr_code_scans).values({
        id: randomUUID(),
        qrCodeId: qrCodeIds[stop],
        teamId,
        userId: memberIds[stop % memberIds.length],
        createdAt: at,
        updatedAt: at,
      });
    }
  }

  console.log(
    `Seeded game ${gameId}: ${ROUTE.length} stops, ${TEAMS.length} teams, ` +
      `${TEAMS.reduce((n, t) => n + t.players.length, 0)} players, ` +
      `${TEAMS.reduce((n, t) => n + t.progress, 0)} scans.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
