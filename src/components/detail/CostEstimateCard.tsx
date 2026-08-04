import { useEffect, useMemo } from "react";
import {
  formatMoneyRange,
  getScenarioCostStatus,
  type CostEstimateSummary,
  type CostScenarioSummary,
  type CostCategorySummary,
  type CostCategoryKey,
} from "@/types/cost";

interface CostEstimateCardProps {
  costEstimate?: CostEstimateSummary | null;
  activeScenarioId?: string | null;
  onScenarioSelect?: (scenarioId: string) => void;
}

const CATEGORY_META: Record<CostCategoryKey, { label: string; icon: string }> = {
  intercity_transport: { label: "大交通", icon: "fa-plane-departure" },
  accommodation: { label: "住宿", icon: "fa-hotel" },
  local_transport: { label: "市内交通", icon: "fa-taxi" },
  admission: { label: "门票", icon: "fa-ticket" },
  meals: { label: "餐饮", icon: "fa-utensils" },
};

function formatEstimatedAt(isoString?: string): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

export function CostEstimateCard({
  costEstimate,
  activeScenarioId,
  onScenarioSelect,
}: CostEstimateCardProps) {
  const scenarios = useMemo(() => costEstimate?.scenarios ?? [], [costEstimate]);
  const scenarioIds = scenarios.map((s) => s.scenario_id).join(",");

  // 只有一个可用场景时自动激活
  useEffect(() => {
    if (scenarios.length === 1 && !activeScenarioId && onScenarioSelect) {
      onScenarioSelect(scenarios[0].scenario_id);
    }
  }, [scenarioIds, activeScenarioId, onScenarioSelect, scenarios]);

  if (!costEstimate || scenarios.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-soft scroll-mt-24">
        <h2 className="font-display mb-3 text-xl font-bold text-gray-900">行程消费预估</h2>
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
          <i className="fa-solid fa-circle-info text-gray-400" aria-hidden="true" />
          <span>费用暂不可估算</span>
        </div>
      </div>
    );
  }

  const isDualMode = scenarios.length > 1;
  const selectedScenario: CostScenarioSummary | undefined = scenarios.find(
    (s) => s.scenario_id === activeScenarioId,
  );

  // 选中的场景未选定（双场景初始未选状态）
  const isUnselected = isDualMode && !selectedScenario;
  const statusInfo = getScenarioCostStatus(selectedScenario, isUnselected);
  const estimatedAtText = formatEstimatedAt(costEstimate.estimated_at);

  // 包含骑行排除说明
  const hasCyclingExclusion = costEstimate.exclusions?.some(
    (e) => e.code === "cycling_cost_not_included" || e.label?.includes("骑行"),
  );

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-soft space-y-6">
      {/* 模块大标题 & 估计时间 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-gray-900">行程消费预估</h2>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              全团预估
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            服务端权威精算 · 不设虚假预算上限
          </p>
        </div>
        {estimatedAtText && (
          <span className="text-[11px] text-gray-400 tabular-nums">
            预估于 {estimatedAtText}
          </span>
        )}
      </div>

      {/* 大交通场景控制器（仅在包含多个交通场景时露出） */}
      {isDualMode && (
        <div className="rounded-xl bg-sand-50/80 p-4 border border-sand-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <i className="fa-solid fa-route text-primary-600 text-xs" aria-hidden="true" />
              <span>选择大交通出行场景</span>
            </span>
            {isUnselected && (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                请选择交通方式查看预估
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="大交通出行场景选择">
            {scenarios.map((sc) => {
              const active = sc.scenario_id === activeScenarioId;
              const isTrain = sc.intercity_mode === "train";
              const isFlight = sc.intercity_mode === "flight";
              const icon = isFlight ? "✈️" : isTrain ? "🚄" : "🚗";
              const scRangeStr = formatMoneyRange(sc.total_range);

              return (
                <button
                  key={sc.scenario_id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onScenarioSelect?.(sc.scenario_id)}
                  className={`flex flex-col items-start gap-1 rounded-xl p-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                    active
                      ? "bg-primary-600 text-white shadow-md shadow-primary-600/20 scale-[1.01]"
                      : "bg-white text-gray-800 border border-gray-200/80 hover:border-primary-300 hover:bg-primary-50/30"
                  }`}
                >
                  <div className="flex w-full items-center justify-between font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden="true">{icon}</span>
                      <span>{sc.label}</span>
                    </span>
                    {active && (
                      <i className="fa-solid fa-circle-check text-white text-xs" aria-hidden="true" />
                    )}
                  </div>
                  <div className={`text-[11px] tabular-nums font-semibold ${active ? "text-primary-100" : "text-gray-500"}`}>
                    {sc.total_scope === "unavailable"
                      ? "费用不可估算"
                      : scRangeStr
                      ? `预估 ${scRangeStr}`
                      : "待确认"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 当前场景金额与状态大牌 */}
      <div className="rounded-xl bg-gradient-to-br from-sand-100/60 via-sand-50/40 to-white p-5 border border-sand-200/50">
        {statusInfo.status === "unselected" ? (
          <div className="py-2 text-center space-y-1">
            <p className="text-base font-bold text-gray-700">{statusInfo.costText}</p>
            <p className="text-xs text-gray-500">点击上方大交通场景切换高铁或机票预估方案</p>
          </div>
        ) : statusInfo.status === "unavailable" ? (
          <div className="py-2 space-y-1">
            <p className="text-xl font-bold text-gray-800">{statusInfo.costText}</p>
            <p className="text-xs text-gray-500">缺少有效价格来源，行程内容仍可正常阅读参考</p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                {selectedScenario?.label ?? "全团总消费"}
              </span>
              {statusInfo.costBadge && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/80">
                  {statusInfo.costBadge}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl tabular-nums">
                {statusInfo.costText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5 分类费用明细 */}
      {selectedScenario && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            费用明细构成
          </h3>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
            {selectedScenario.categories.map((cat: CostCategorySummary) => {
              const meta = CATEGORY_META[cat.category] ?? { label: cat.category, icon: "fa-circle-dollar-to-slot" };
              const isPriced = cat.coverage === "priced" && cat.range;
              const rangeStr = formatMoneyRange(cat.range);

              const priceBasisText =
                cat.price_basis === "sourced"
                  ? "来源查价"
                  : cat.price_basis === "reference"
                    ? "参考估算"
                    : cat.price_basis === "mixed"
                      ? "来源与参考混合"
                      : cat.price_basis === "policy_zero"
                        ? "按规则计为 ¥0"
                        : null;

              return (
                <div
                  key={cat.category}
                  className="flex items-center justify-between gap-3 p-3.5 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <i className={`fa-solid ${meta.icon}`} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-800">{meta.label}</div>
                      <div className="text-[11px] text-gray-600 truncate">{cat.basis_label}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isPriced ? (
                      <div className="font-bold text-gray-900 tabular-nums text-sm">
                        {rangeStr}
                      </div>
                    ) : (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                        {cat.basis_label || "未计入"}
                      </span>
                    )}
                    {priceBasisText && (
                      <div className="text-[10px] text-gray-600">
                        {priceBasisText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 假设与排除说明 & 免责 */}
      <div className="space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
        {hasCyclingExclusion && (
          <div className="flex items-center gap-1.5 font-medium text-amber-700">
            <i className="fa-solid fa-circle-exclamation text-amber-500" aria-hidden="true" />
            <span>骑行费用暂未计入</span>
          </div>
        )}

        {costEstimate.assumptions?.length > 0 && (
          <div className="space-y-1">
            <div className="font-medium text-gray-600">计算假设：</div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {costEstimate.assumptions.map((a) => (
                <li key={a.code}>{a.label}</li>
              ))}
            </ul>
          </div>
        )}

        {costEstimate.exclusions?.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="font-medium text-gray-600">不含项目：</div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {costEstimate.exclusions.map((e) => (
                <li key={e.code}>{e.label}</li>
              ))}
            </ul>
          </div>
        )}

        {costEstimate.notice && (
          <p className="border-t border-gray-50 pt-2 text-[11px] text-gray-400 leading-relaxed">
            {costEstimate.notice}
          </p>
        )}
      </div>
    </div>
  );
}
