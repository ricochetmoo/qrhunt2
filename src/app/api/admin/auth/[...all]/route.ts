import { toNextJsHandler } from "better-auth/next-js";
import { adminAuth } from "@/lib/admin-auth";

export const { GET, POST, PATCH, PUT, DELETE } =
  toNextJsHandler(adminAuth);