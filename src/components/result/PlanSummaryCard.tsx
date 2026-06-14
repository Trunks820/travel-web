import type { CSSProperties } from "react";
import type { TripPlan } from "@/types/trip";

interface PlanSummaryCardProps {
  plan: TripPlan;
  image: string;
  recommended?: boolean;
  index?: number;
  onClick: () => void;
}

const PACE_LABEL: Record<string, string> = {
  RELAXED: "轻松",
  MODERATE: "适中",
  INTENSIVE: "紧凑",
};

const TAG_TONES = [
  "bg-accent-50 text-accent-500",
  "bg-blue-50 text-blue-500",
  "bg-primary-50 text-primary-600",
  "bg-purple-50 text-purple-500",
];

export function PlanSummaryCard({ plan, image, recommended, index = 0, onClick }: PlanSummaryCardProps) {
  const paceText = PACE_LABEL[plan.pace.level] ?? "适中";
  const hours = Math.floor(plan.pace.total_commute_minutes / 60);
  const mins = plan.pace.total_commute_minutes % 60;
  const commuteText = hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;

  return (
    <div
      style={{ "--i": index } as CSSProperties}
      className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card"
    >
      {/* 封面图 */}
      <div className="relative h-56 overflow-hidden">
        <img src={image} alt={plan.title} className="h-full w-full object-cover" />
        {recommended && (
          <div className="absolute left-4 top-4 flex items-center rounded-full bg-accent-500 px-3 py-1 text-sm font-bold text-white shadow-md">
            <i className="fas fa-thumbs-up mr-1.5" aria-hidden="true" /> 推荐
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-gray-800">{plan.title}</h3>
          <button
            type="button"
            onClick={onClick}
            aria-label="查看详情"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-primary-300 hover:text-primary-600"
          >
            <i className="fas fa-chevron-right text-xs" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500">{plan.summary}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {plan.tags.slice(0, 4).map((tag, i) => (
            <span key={tag} className={`rounded-full px-2.5 py-1 text-xs ${TAG_TONES[i % TAG_TONES.length]}`}>
              {tag}
            </span>
          ))}
        </div>

        {/* 节奏 + 通勤（真实数据；价格/天气待后端补充） */}
        <div className="mt-auto flex items-end justify-between border-t border-gray-50 pt-4">
          <div className="flex flex-col">
            <span className="mb-1 flex items-center text-xs text-gray-400">
              <i className="fas fa-gauge-high mr-1 text-primary-600" aria-hidden="true" /> 行程节奏
            </span>
            <span className="text-lg font-bold text-primary-700">{paceText}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="mb-1 flex items-center text-xs text-gray-400">
              <i className="fas fa-route mr-1 text-primary-600" aria-hidden="true" /> 总通勤
            </span>
            <span className="text-sm font-semibold text-gray-700">{commuteText}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-6 pb-6 pt-2">
        <button
          type="button"
          onClick={onClick}
          className="flex-1 rounded-full bg-primary-700 py-2.5 font-medium text-white transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
        >
          查看详情
        </button>
        <button
          type="button"
          className="flex items-center justify-center rounded-full border border-gray-200 px-4 py-2.5 text-gray-600 transition-colors hover:bg-gray-50"
        >
          <i className="far fa-heart mr-2" aria-hidden="true" /> 收藏
        </button>
      </div>
    </div>
  );
}
