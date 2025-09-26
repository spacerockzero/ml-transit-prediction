import { useEffect, useState } from "react";

interface ResponseTimeStats {
  averageMs: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  totalRequests: number;
  recentSamples: number;
}

interface StatsResponse {
  success: boolean;
  data: ResponseTimeStats;
  timestamp: string;
}

const API_BASE_URL = "http://localhost:3000";

export function useResponseTimeStats(interval: number = 5000) {
  const [stats, setStats] = useState<ResponseTimeStats>({
    averageMs: 0,
    medianMs: 0,
    minMs: 0,
    maxMs: 0,
    totalRequests: 0,
    recentSamples: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/response-times`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StatsResponse = await response.json();
      if (data.success) {
        setStats(data.data);
        setError(null);
      } else {
        setError("Failed to fetch stats");
      }
    } catch (err) {
      console.error("Failed to fetch response time stats:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchStats();

    // Set up periodic fetching
    const intervalId = setInterval(fetchStats, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [interval]);

  return { stats, isLoading, error, refetch: fetchStats };
}
