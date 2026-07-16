import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAutoRefreshOptions {
  /** Pause polling while false (e.g. during a mutation / form submit). Default true. */
  enabled?: boolean;
  /** Fire the callback once immediately on mount. Set false when the screen already
   *  does its own initial (spinner) load and you only want background polling. */
  immediate?: boolean;
  /** Extra dependencies — changing any of these re-fetches now and resets the timer. */
  deps?: readonly unknown[];
}

interface UseAutoRefreshReturn {
  /** Timestamp of the last successful fetch, or null before the first one. */
  lastUpdated: Date | null;
  /** Imperatively trigger a refresh outside of the interval. */
  refresh: () => void;
}

/**
 * useAutoRefresh (React Native)
 *
 * Mobile twin of the website's `frontend/src/hooks/useAutoRefresh.ts`. Wraps an
 * async fetch with periodic polling so a screen stays live without the user
 * pulling to refresh.
 *
 * - Calls `callback` every `intervalMs` (default 30s).
 * - Optionally calls it once immediately (`options.immediate`, default true).
 * - Re-fetches immediately whenever `options.deps` change.
 * - Pauses while `options.enabled` is false.
 * - Pauses while the app is backgrounded (AppState !== 'active') and resumes —
 *   fetching immediately — when it returns to the foreground. This is the RN
 *   equivalent of the web hook pausing on `document.hidden`.
 *
 * @param callback   Async function that fetches and sets state. Should be a
 *                   "silent" fetch (no full-screen loading toggle) so polling
 *                   doesn't flash a spinner.
 * @param intervalMs Polling interval in ms (default 30000).
 * @param options    Optional configuration.
 */
export function useAutoRefresh(
  callback: () => Promise<void>,
  intervalMs: number = 30_000,
  options: UseAutoRefreshOptions = {},
): UseAutoRefreshReturn {
  const { enabled = true, immediate = true, deps = [] } = options;

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Stable refs so the interval closure always sees the latest values without
  // needing to tear down / re-register the timer.
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
      // Errors are handled inside the callback; swallow here to keep polling alive.
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

  // Pause/resume with app foreground state (RN analog of visibilitychange).
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        if (enabledRef.current) {
          run();
          startInterval();
        }
      } else {
        stopInterval();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [run, startInterval, stopInterval]);

  // Main effect: fetch immediately (optional), then poll. Re-runs when enabled,
  // interval, or any dep changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (enabled) {
      if (immediate) run();
      startInterval();
    } else {
      stopInterval();
    }
    return stopInterval;
  // deps spread intentionally so a dep change re-fetches and resets the timer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, ...deps]);

  const refresh = useCallback(() => {
    run();
    if (enabledRef.current) startInterval();
  }, [run, startInterval]);

  return { lastUpdated, refresh };
}
