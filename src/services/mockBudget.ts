import type { TripPlan } from "@/types/trip";

/**
 * ⚠️ 占位数据 —— 后端暂未返回预算明细与天气。
 * 预算：远期由后端汇总门票/餐饮/住宿/交通真实账单。
 * 天气：后端下个版本并入 TripResult（按行程日期与城市对齐）。
 * 接口就绪后删除本文件，改用真实字段。
 */

export interface BudgetBreakdownItem {
  icon: string; // font-awesome 类名（不含 fa-solid 前缀）
  label: string;
  amount: number;
  percentage: number;
}

export interface BudgetData {
  total: number;
  budgetCap: number;
  usedPercent: number;
  people: number;
  breakdown: BudgetBreakdownItem[];
}

export interface WeatherDayData {
  date: string;
  dayLabel: string;
  icon: string; // emoji
  high: number;
  low: number;
}

export interface WeatherData {
  city: string;
  current: { temp: number; desc: string; humidity: number; wind: string; icon: string };
  days: WeatherDayData[];
}

/** 预算占位：按天数粗略缩放，给出合理的明细结构 */
export function mockBudget(plan: TripPlan, people = 1): BudgetData {
  const dayCount = plan.days.length || 1;
  const perDayPerPerson = 1800;
  const total = Math.round(dayCount * perDayPerPerson * people);
  const breakdown: BudgetBreakdownItem[] = [
    { icon: "fa-plane", label: "交通", amount: Math.round(total * 0.28), percentage: 28 },
    { icon: "fa-hotel", label: "住宿", amount: Math.round(total * 0.35), percentage: 35 },
    { icon: "fa-utensils", label: "餐饮", amount: Math.round(total * 0.17), percentage: 17 },
    { icon: "fa-ticket", label: "景点门票", amount: Math.round(total * 0.1), percentage: 10 },
    { icon: "fa-ellipsis", label: "其他", amount: Math.round(total * 0.1), percentage: 10 },
  ];
  const budgetCap = Math.round((total / 0.85) / 100) * 100;
  return { total, budgetCap, usedPercent: 85, people, breakdown };
}

/** 天气占位：给出 5 天结构，待后端真实数据替换 */
export function mockWeather(city: string, dayCount = 5): WeatherData {
  const labels = ["今天", "明天", "后天", "周四", "周五", "周六", "周日"];
  const icons = ["☀️", "☀️", "🌤️", "☀️", "🌤️", "⛅", "☀️"];
  const days: WeatherDayData[] = Array.from({ length: Math.min(dayCount, 5) }, (_, i) => ({
    date: `6/${10 + i}`,
    dayLabel: labels[i] ?? `第${i + 1}天`,
    icon: icons[i] ?? "☀️",
    high: 28 + (i % 3),
    low: 24 + (i % 2),
  }));
  return {
    city,
    current: { temp: 28, desc: "多云转晴", humidity: 72, wind: "东南风 3级", icon: "🌤️" },
    days,
  };
}
