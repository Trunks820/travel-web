import { useEffect, useRef, useCallback } from "react";

interface UsePollingOptions<T> {
  fetcher: () => Promise<T>;
  onData: (data: T) => boolean | void;
  interval?: number;
  maxAttempts?: number;
  onTimeout?: () => void;
  onConsecutiveErrors?: (count: number) => void;
  consecutiveErrorThreshold?: number;
  enabled?: boolean;
}

export function usePolling<T>({
  fetcher,
  onData,
  interval = 2000,
  maxAttempts = 90,
  onTimeout,
  onConsecutiveErrors,
  consecutiveErrorThreshold = 3,
  enabled = true,
}: UsePollingOptions<T>) {
  const attemptRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    stoppedRef.current = false;
    attemptRef.current = 0;
    consecutiveErrorsRef.current = 0;

    async function tick() {
      if (stoppedRef.current) return;
      attemptRef.current++;

      try {
        const data = await fetcher();
        consecutiveErrorsRef.current = 0;
        const shouldStop = onData(data);
        if (shouldStop) return;
      } catch {
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= consecutiveErrorThreshold) {
          onConsecutiveErrors?.(consecutiveErrorsRef.current);
        }
      }

      if (attemptRef.current >= maxAttempts) {
        onTimeout?.();
        return;
      }

      timerRef.current = setTimeout(tick, interval);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timerRef.current);
      } else if (!stoppedRef.current && attemptRef.current < maxAttempts) {
        tick();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    tick();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stop();
    };
  }, [enabled, fetcher, onData, interval, maxAttempts, onTimeout, onConsecutiveErrors, consecutiveErrorThreshold, stop]);

  return { stop };
}
