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
  const inFlightRef = useRef(false);

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
      inFlightRef.current = true;
      attemptRef.current++;

      try {
        const data = await fetcher();
        // await 期间可能已卸载/停止，不再回调（onData 内含 navigate）
        if (stoppedRef.current) return;
        // 错误连击结束时回调 0，让"网络不稳定"横幅消失
        if (consecutiveErrorsRef.current > 0) onConsecutiveErrors?.(0);
        consecutiveErrorsRef.current = 0;
        const shouldStop = onData(data);
        if (shouldStop) {
          stoppedRef.current = true;
          return;
        }
      } catch {
        if (stoppedRef.current) return;
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= consecutiveErrorThreshold) {
          onConsecutiveErrors?.(consecutiveErrorsRef.current);
        }
      } finally {
        inFlightRef.current = false;
      }

      if (attemptRef.current >= maxAttempts) {
        onTimeout?.();
        return;
      }

      // 页面隐藏时不续链，由 visibilitychange 恢复时重启，避免双链并发
      if (document.hidden) return;

      timerRef.current = setTimeout(tick, interval);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timerRef.current);
      } else if (
        !stoppedRef.current &&
        !inFlightRef.current &&
        attemptRef.current < maxAttempts
      ) {
        // in-flight 的请求返回后会自己续链；只有链已断时才重启，保证单链
        clearTimeout(timerRef.current);
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
