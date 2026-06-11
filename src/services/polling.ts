/**
 * Generic polling utility.
 * Returns a cleanup function to stop the polling loop.
 */
export function startPolling<T>(
  fetcher: () => Promise<T>,
  onData: (data: T) => boolean | void,
  options: { interval?: number; maxAttempts?: number; onTimeout?: () => void },
): () => void {
  const interval = options.interval ?? 2000;
  const maxAttempts = options.maxAttempts ?? 90;
  let attempt = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  async function tick() {
    if (stopped) return;
    attempt++;

    try {
      const data = await fetcher();
      const shouldStop = onData(data);
      if (shouldStop) return;
    } catch {
      // network error — keep polling
    }

    if (attempt >= maxAttempts) {
      options.onTimeout?.();
      return;
    }

    timer = setTimeout(tick, interval);
  }

  tick();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
