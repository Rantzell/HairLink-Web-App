import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoRefreshOptions {
  /** Pause polling while true (e.g. during form submission). */
  enabled?: boolean;
  /** Extra dependency values — changing these immediately re-fetches and resets the timer. */
  deps?: readonly unknown[];
}

interface UseAutoRefreshReturn {
  /** Timestamp of the last successful fetch, or null before first load. */
  lastUpdated: Date | null;
  /** Imperatively trigger a refresh outside of the interval. */
  refresh: () => void;
}

/**
 * useAutoRefresh
 *
 * Wraps an async fetch function with periodic polling.
 *
 * - Calls `callback` immediately on mount (and whenever `deps` change).
 * - Re-calls `callback` every `intervalMs` milliseconds.
 * - Pauses the interval while `options.enabled` is false (e.g. during mutations).
 * - Pauses the interval while the browser tab is hidden; resumes on visibility.
 * - Returns `lastUpdated` (Date of last resolved call) and `refresh()` (manual trigger).
 *
 * @param callback  Async function that fetches and sets state.
 * @param intervalMs  Polling interval in milliseconds (default 30 000 = 30 s).
 * @param options  Optional configuration.
 */
export function useAutoRefresh(
  callback: () => Promise<void>,
  intervalMs: number = 30_000,
  options: UseAutoRefreshOptions = {},
): UseAutoRefreshReturn {
  const { enabled = true, deps = [] } = options;

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Keep a stable ref to the latest callback so the interval closure never
  // holds a stale reference without needing to re-register the interval.
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      await callbackRef.current();
      setLastUpdated(new Date());
    } catch {
      // Errors handled inside the callback; swallow here to keep polling alive.
    }
  }, []);

  const startInterval = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(run, intervalMs);
  }, [run, intervalMs]);

  const stopInterval = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Visibility-based pause/resume
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        // Resume: fetch immediately then restart interval
        run();
        startInterval();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [run, startInterval, stopInterval]);

  // Main effect: fetch immediately, then poll
  // Runs on mount and whenever deps or enabled changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    run();
    if (enabled) {
      startInterval();
    } else {
      stopInterval();
    }
    return stopInterval;
  // deps is spread intentionally — we want to re-run when any dep changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, ...deps]);

  /** Manual refresh: fetch right now and reset the interval timer. */
  const refresh = useCallback(() => {
    run();
    if (enabledRef.current) startInterval();
  }, [run, startInterval]);

  return { lastUpdated, refresh };
}
