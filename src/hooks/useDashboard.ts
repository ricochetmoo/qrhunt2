"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api-client";
import type { Dashboard } from "@/server/admin/dashboard/types";

const POLL_INTERVAL_MS = 10_000;

export function useDashboard(gameId: string) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(isInitial: boolean) {
      if (isInitial) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsRefreshing(true);
      }

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
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled && isInitial) {
          // Keep the last good data on background refresh failures; only
          // surface an error when there is nothing to show yet.
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
          setIsLoading(false);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    load(true);
    const timer = setInterval(() => load(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [gameId]);

  return { dashboard, error, isLoading, isRefreshing };
}
