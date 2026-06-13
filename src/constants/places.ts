/** 地点 role / category 的展示适配 —— 兼容后端真实取值与 mock 取值 */

/** 是否为「主锚点」类地点（决定时间轴圆点是否高亮主色） */
const ANCHOR_ROLES = new Set([
  "anchor",
  "anchor_activity",
  "secondary_activity",
]);

export function isAnchorRole(role: string): boolean {
  return ANCHOR_ROLES.has(role);
}

/** category → emoji 图标，覆盖后端真实值与 mock 值 */
const CATEGORY_ICON: Record<string, string> = {
  // 后端真实 category
  park: "🌳",
  photo_spot: "📷",
  attraction: "🎡",
  business_area: "🏙️",
  restaurant: "🍜",
  other: "📍",
  // mock / 旧值
  landmark: "🏛️",
  food: "🍜",
  scenic: "🌿",
  culture: "🎭",
  shopping: "🛍️",
  nightlife: "🌃",
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICON[category] ?? "📍";
}
