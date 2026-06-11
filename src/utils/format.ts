export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function commuteModeName(mode: string): string {
  const map: Record<string, string> = {
    walking: "步行",
    transit: "公交",
    taxi: "打车",
  };
  return map[mode] ?? mode;
}
