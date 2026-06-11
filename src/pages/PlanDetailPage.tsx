import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DayCard } from "@/components/detail/DayCard";
import { PaceIndicator } from "@/components/result/PaceIndicator";
import { DetailSkeleton } from "@/components/skeleton/DetailSkeleton";
import { useTripStore } from "@/stores/tripStore";
import { fetchResult, ApiRequestError } from "@/services/api";
import type { TripPlan, TripResult } from "@/types/trip";
import { CloudDecor } from "@/components/layout/CloudDecor";

const MapView = lazy(() =>
  import("@/components/detail/MapView").then((m) => ({ default: m.MapView })),
);

export default function PlanDetailPage() {
  const { resultId, planId } = useParams<{ resultId: string; planId: string }>();
  const navigate = useNavigate();
  const storeResult = useTripStore((s) => s.result);
  const setResult = useTripStore((s) => s.setResult);
  const selectedDay = useTripStore((s) => s.selectedDay);
  const selectDay = useTripStore((s) => s.selectDay);

  const [fetchedResult, setFetchedResult] = useState<TripResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlaceId, setActivePlaceId] = useState<number | null>(null);

  const result = storeResult ?? fetchedResult;

  useEffect(() => {
    if (storeResult || fetchedResult || !resultId) return;
    setLoading(true);
    fetchResult(resultId)
      .then((data) => { setFetchedResult(data); setResult(data); })
      .catch((err) => { setError(err instanceof ApiRequestError ? err.message : "加载失败"); })
      .finally(() => setLoading(false));
  }, [resultId, storeResult, fetchedResult, setResult]);

  const plan: TripPlan | undefined = result?.plans.find((p) => p.plan_id === planId);
  const effectiveDay = selectedDay || plan?.days[0]?.day || 1;
  const currentDay = plan?.days.find((d) => d.day === effectiveDay) ?? plan?.days[0];

  if (loading) return <DetailSkeleton />;

  if (error || !plan || !currentDay) {
    return (
      <div className="empty-state animate-fade-in">
        <span className="empty-state-icon">📋</span>
        <p className="text-sm font-medium text-primary-700">{error ?? "方案未找到"}</p>
        <button onClick={() => navigate("/")} className="btn-primary mt-2">
          重新规划
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl">
      <CloudDecor intensity="light" />

      {/* 头部信息 */}
      <div className="mb-6 animate-fade-in">
        <button
          onClick={() => navigate(`/result/${resultId}`)}
          className="mb-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-sand-500 transition-colors hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
          返回方案列表
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary-800">{plan.title}</h1>
            <p className="mt-1 text-sm text-sand-500">{plan.summary}</p>
          </div>
          <div className="shrink-0">
            <PaceIndicator level={plan.pace.level} commuteStatus={plan.pace.commute_status} totalMinutes={plan.pace.total_commute_minutes} />
          </div>
        </div>
      </div>

      {/* Day 标签 */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {plan.days.map((d) => (
          <button
            key={d.day}
            onClick={() => { selectDay(d.day); setActivePlaceId(null); }}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
              effectiveDay === d.day
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white/80 text-primary-700 shadow-sm backdrop-blur-sm hover:bg-primary-50"
            }`}
          >
            Day {d.day}
            <span className="ml-1.5 text-xs opacity-70">{d.title}</span>
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 animate-slide-up">
        <div className="order-2 lg:order-1">
          <DayCard day={currentDay} activePlaceId={activePlaceId} onPlaceClick={setActivePlaceId} />
        </div>
        <div className="order-1 h-[280px] lg:order-2 lg:sticky lg:top-20 lg:h-[calc(100vh-8rem)]">
          <Suspense fallback={<div className="card flex h-full items-center justify-center"><span className="text-sm text-sand-400">加载地图...</span></div>}>
            <MapView day={currentDay} activePlaceId={activePlaceId} onMarkerClick={setActivePlaceId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
