/**
 * 记录用户最近一次的行程（localStorage，跨会话）。
 * 用于首页「继续上次行程」入口——用户中途退出后再进来能一键找回结果。
 * 只存定位所需的最小信息，不存完整结果（结果走 API 重新拉取）。
 */

const KEY = "yuntu-recent-trip";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 天后视为过期

export interface RecentTrip {
  resultId: string;
  jobId: string;
  city: string;
  days: number;
  savedAt: number;
}

export function saveRecentTrip(trip: Omit<RecentTrip, "savedAt">): void {
  try {
    const data: RecentTrip = { ...trip, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

export function getRecentTrip(): RecentTrip | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as RecentTrip;
    if (!data.resultId || !data.jobId) return null;
    // 超过 7 天的记录视为过期：后端可能已清理结果，点进去会是死胡同
    if (!data.savedAt || Date.now() - data.savedAt > MAX_AGE_MS) {
      clearRecentTrip();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearRecentTrip(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
