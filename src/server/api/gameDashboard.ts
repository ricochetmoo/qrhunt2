import type { Context } from "hono";

import {drizzleDashboardRepository} from "../admin/dashboard/repository";
import {getForGame} from "@/server/admin/dashboard/getForGame";

export async function gameDashboard(c: Context) {
    const { gameId } = c.req.param();
    const dashboard = await getForGame(gameId, drizzleDashboardRepository);
    return c.json(dashboard);
}
