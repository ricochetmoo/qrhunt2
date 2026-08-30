import { handle } from "hono/vercel";

import { api } from "@/server/api";

const handler = handle(api);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
