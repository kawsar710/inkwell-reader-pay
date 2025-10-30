import { useState, useEffect, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
}

export function usePolling<T>(
  fetchFunction: () => Promise<T>,
  options: UsePollingOptions = {}
) {
  const { interval = 30000, enabled = true } = options; // 30 seconds default
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchFunction();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    if (enabled) {
      // Initial fetch
      fetchData();

      // Set up polling
      const pollInterval = setInterval(fetchData, interval);

      return () => clearInterval(pollInterval);
    }
  }, [enabled, interval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}