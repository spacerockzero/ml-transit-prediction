import { useEffect, useState } from "react";

interface PredictionStats {
  today: number;
  total: number;
  averageDaily: number;
  activeDays: number;
  date: string;
}

interface StatsResponse {
  success: boolean;
  data: PredictionStats;
  timestamp: string;
}

const API_BASE_URL = "http://localhost:3000";

export function usePredictionStats(interval: number = 5000) {
  const [stats, setStats] = useState<PredictionStats>({
    today: 0,
    total: 0,
    averageDaily: 0,
    activeDays: 0,
    date: new Date().toISOString().split('T')[0],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/predictions`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StatsResponse = await response.json();
      if (data.success) {
        setStats(data.data);
        setError(null);
      } else {
        setError("Failed to fetch prediction stats");
      }
    } catch (err) {
      console.error("Failed to fetch prediction stats:", err);
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
