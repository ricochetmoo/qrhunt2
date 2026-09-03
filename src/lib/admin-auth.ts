import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import { db } from "@/db";
import { authSchema } from "@/db/schema";
import { getAdminAuthSecret } from "./env";

export const adminAuth = betterAuth({
  appName: "QR Hunt Admin",
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/admin/auth",
  secret: getAdminAuthSecret(),

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
  },

  advanced: {
    cookiePrefix: "qr-hunt-admin",
  },
});