import type { BudgetData } from "@/services/mockBudget";

interface BudgetCardProps {
  data: BudgetData;
}

export function BudgetCard({ data }: BudgetCardProps) {
  const { total, budgetCap, usedPercent, people, breakdown } = data;
  const remaining = Math.max(0, budgetCap - total);

  return (
    <div className="rounded-xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
      <div className="mb-1">
        <h2 className="text-sm font-bold text-gray-800">预算总览（{people}人）</h2>
      </div>
      <div className="mb-4 flex items-end justify-between">
        <div className="text-3xl font-bold text-primary-600 tabular-nums">¥ {total.toLocaleString()}</div>
        <div className="mb-1 text-xs text-gray-600 tabular-nums">总预算 ¥ {budgetCap.toLocaleString()}</div>
      </div>

      <div className="mb-5">
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${usedPercent}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-gray-600 tabular-nums">
          <span>已使用 {usedPercent}%</span>
          <span>剩余 ¥ {remaining.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-4">
        {breakdown.map((item) => (
          <div key={item.label} className="flex items-center text-[11px]">
            <div className="flex w-5 justify-center text-sm text-primary-600 opacity-80">
              <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
            </div>
            <div className="ml-2 w-14 font-medium text-gray-600">{item.label}</div>
            <div className="mx-3 flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${item.percentage}%` }} />
            </div>
            <div className="flex w-[60px] flex-col text-right tabular-nums">
              <div className="mb-0.5 font-semibold text-gray-700">¥ {item.amount.toLocaleString()}</div>
              <div className="text-[10px] leading-none text-gray-600">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-gray-50 pt-3 text-[10px] leading-none text-gray-400">
        预算为估算参考，实际花费以出行为准
      </p>
    </div>
  );
}
