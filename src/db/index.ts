import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "@/lib/env";
import { authSchema, gameSchema } from "./schema";

function createDatabase() {
  const sql = neon(getDatabaseUrl());

  return drizzle({ client: sql, schema: { ...authSchema, ...gameSchema } });
}

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export function getDb() {
  database ??= createDatabase();

  return database;
}

/**
 * Keep the adapter API ergonomic while deferring DATABASE_URL validation until
 * a database operation is actually attempted. This keeps `next build` useful
 * before local or deployment secrets have been configured.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const target = getDb();
    const value = Reflect.get(target, property, target);

    return typeof value === "function" ? value.bind(target) : value;
  },
});
