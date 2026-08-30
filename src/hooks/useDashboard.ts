"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";
import type { Dashboard } from "@/server/admin/dashboard/types";

export function useDashboard(gameId: string) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await apiClient.api.admin.games[":gameId"].dashboard.$get({
          param: { gameId },
        });

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = (await res.json()) as unknown as Dashboard;

        if (!cancelled) {
          setDashboard(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return { dashboard, error, isLoading };
}
