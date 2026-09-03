"use client";

import { createAuthClient } from "better-auth/react";

const adminAuthClient = createAuthClient({
  basePath: "/api/admin/auth",
});

export const {
  signIn: adminSignIn,
  signOut: adminSignOut,
  useSession: useAdminSession,
} = adminAuthClient;