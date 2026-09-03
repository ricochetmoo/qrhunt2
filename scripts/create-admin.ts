import { pathToFileURL } from "node:url";

import { loadEnvConfig } from "@next/env";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { neon } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import { authSchema, user } from "../src/db/schema";
import { getAuthSecret, getDatabaseUrl } from "../src/lib/env";

type AdminAccount = {
  id: string;
  email: string;
  isAdmin: boolean;
};

function createCliAuth() {
  const database = drizzle({
    client: neon(getDatabaseUrl()),
    schema: authSchema,
  });

  const auth = betterAuth({
    appName: "QR Hunt",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret: getAuthSecret(),
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      anonymous({
        emailDomainName: "anonymous.qrhunt.scoutslab.org.uk",
      }),
    ],
  });

  return { auth, database };
}

/**
 * Create an administrator using Better Auth's server API.
 *
 * Better Auth owns credential creation and password hashing. The admin flag is
 * set afterwards because `is_admin` is an application field on the shared user
 * table rather than a Better Auth sign-up field.
 */
export async function createAdmin(email: string, password: string): Promise<AdminAccount> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("An email address is required.");
  }

  if (!password) {
    throw new Error("A password is required.");
  }

  // Load .env files before importing server modules that validate their
  // environment at module initialization time.
  loadEnvConfig(process.cwd());

  const { auth, database } = createCliAuth();

  const result = await auth.api.signUpEmail({
    body: {
      name: "QR Hunt Administrator",
      email: normalizedEmail,
      password,
    },
  });

  const [updatedUser] = await database
    .update(user)
    .set({ isAdmin: true })
    .where(eq(user.id, result.user.id))
    .returning({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

  if (!updatedUser) {
    throw new Error(`The account was created, but could not be marked as an administrator: ${normalizedEmail}`);
  }

  return updatedUser;
}

function parseCliArgs(args: string[]): { email: string; password: string } {
  if (args.length !== 2) {
    throw new Error("Usage: pnpm exec tsx scripts/create-admin.ts <email> <password>");
  }

  return { email: args[0], password: args[1] };
}

async function main() {
  const { email, password } = parseCliArgs(process.argv.slice(2));
  const admin = await createAdmin(email, password);

  console.log(`Created administrator account for ${admin.email} (${admin.id}).`);
}

const invokedFile = process.argv[1];
if (invokedFile && import.meta.url === pathToFileURL(invokedFile).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
