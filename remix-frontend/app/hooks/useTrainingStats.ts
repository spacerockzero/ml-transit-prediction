import { useEffect, useState } from "react";

interface TrainingData {
  total_shipments: number;
  date_range: {
    start: string;
    end: string;
  };
  carriers: string[];
  service_levels: string[];
  zones_covered: number[];
}

interface ModelInfo {
  version: string;
  training_duration_minutes: number;
  features_count: number;
  validation_accuracy: {
    transit_time_mae: number;
    shipping_cost_mae: number;
  };
}

interface TrainingMetadata {
  last_updated: string;
  training_data: TrainingData;
  model_info: ModelInfo;
  data_sources: string[];
}

interface TrainingStatsResponse {
  success: boolean;
  data: TrainingMetadata;
  timestamp: string;
}

const API_BASE_URL = "http://localhost:3000";

export function useTrainingStats(interval: number = 30000) { // Check every 30 seconds
  const [metadata, setMetadata] = useState<TrainingMetadata>({
    last_updated: "2024-01-01T00:00:00Z",
    training_data: {
      total_shipments: 0,
      date_range: { start: "2023-01-01", end: "2024-12-31" },
      carriers: [],
      service_levels: [],
      zones_covered: []
    },
    model_info: {
      version: "1.0.0",
      training_duration_minutes: 0,
      features_count: 17,
      validation_accuracy: {
        transit_time_mae: 0.0,
        shipping_cost_mae: 0.0
      }
    },
    data_sources: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainingStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stats/training`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TrainingStatsResponse = await response.json();
      if (data.success) {
        setMetadata(data.data);
        setError(null);
      } else {
        setError("Failed to fetch training metadata");
      }
    } catch (err) {
      console.error("Failed to fetch training metadata:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchTrainingStats();

    // Set up periodic fetching
    const intervalId = setInterval(fetchTrainingStats, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [interval]);

  // Format helpers
  const formatDateRange = () => {
    const start = new Date(metadata.training_data.date_range.start);
    const end = new Date(metadata.training_data.date_range.end);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `${formatDate(start)} to ${formatDate(end)}`;
  };

  const formatLastUpdated = () => {
    const date = new Date(metadata.last_updated);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShipmentCount = () => {
    return metadata.training_data.total_shipments.toLocaleString();
  };

  return {
    metadata,
    isLoading,
    error,
    refetch: fetchTrainingStats,
    formatDateRange,
    formatLastUpdated,
    formatShipmentCount
  };
}
