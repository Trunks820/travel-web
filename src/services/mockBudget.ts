import type { TripPlan } from "@/types/trip";

/**
 * ⚠️ 占位数据 —— 后端暂未返回预算明细。
 * 预算：远期由后端汇总门票/餐饮/住宿/交通真实账单，并入 TripPlan。
 * 接口就绪后删除本文件，改用真实字段。
 * （天气已接入后端 TripResult.weather，相关占位已移除。）
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
