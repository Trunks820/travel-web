export const PREFERENCE_OPTIONS = [
  "美食",
  "citywalk",
  "拍照",
  "夜景",
  "文化历史",
  "自然风光",
  "亲子",
  "购物",
] as const;

export const AVOID_OPTIONS = [
  "网红打卡",
  "人太多",
  "太累",
  "爬山",
  "商业街",
] as const;

export const PACE_OPTIONS = [
  { value: "relaxed", label: "轻松" },
  { value: "moderate", label: "适中" },
] as const;

export const SUPPORTED_CITIES = [
  "重庆",
  "成都",
  "武汉",
  "南京",
  "杭州",
  "洛阳",
  "福州",
  "郑州",
  "长沙",
  "西安",
] as const;
