import type { TripPlan } from "@/types/trip";
import { PaceIndicator } from "./PaceIndicator";

interface PlanSummaryCardProps {
  plan: TripPlan;
  recommended?: boolean;
  onClick: () => void;
}

export function PlanSummaryCard({ plan, recommended, onClick }: PlanSummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-interactive group relative w-full p-6 text-left"
    >
      {recommended && (
        <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent-500 to-accent-400 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.3l2 4.1 4.5.7-3.3 3.2.8 4.4L8 11.4l-4 2.3.8-4.4-3.3-3.2 4.5-.7z" /></svg>
          推荐
        </span>
      )}

      <h3 className="font-display text-lg font-bold text-primary-800 transition-colors group-hover:text-primary-600">
        {plan.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-sand-500">
        {plan.summary}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {plan.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 border-t border-primary-50 pt-3">
        <PaceIndicator
          level={plan.pace.level}
          commuteStatus={plan.pace.commute_status}
          totalMinutes={plan.pace.total_commute_minutes}
        />
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-accent-500 transition-transform group-hover:translate-x-0.5">
        查看详情
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5" /></svg>
      </div>
    </button>
  );
}
