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
    driving: "驾车",
  };
  return map[mode] ?? mode;
}

/**
 * 过滤景点 brief 里的生成期占位/指令残留文案，避免脏文案露给用户。
 * 例："写成咖啡/茶歇休息点"、"作为次要活动简洁说明"、"…但不要补充无来源事实"。
 * 命中占位返回空串（调用方据此隐藏）；正常文案原样返回。
 */
const BRIEF_PLACEHOLDER_RE = /(写成|作为.{0,8}(说明|节点|停留点|展开)|不要补充|无来源事实|简洁说明)/;

export function cleanBrief(brief: string | null | undefined): string {
  if (!brief) return "";
  const t = brief.trim();
  return BRIEF_PLACEHOLDER_RE.test(t) ? "" : t;
}
