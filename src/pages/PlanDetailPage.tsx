import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Timeline } from "@/components/detail/Timeline";
import { DetailSkeleton } from "@/components/skeleton/DetailSkeleton";
import { PlaceDetailModal } from "@/components/detail/PlaceDetailModal";
import { BudgetCard } from "@/components/detail/BudgetCard";
import { WeatherCard } from "@/components/detail/WeatherCard";
import { useTripStore } from "@/stores/tripStore";
import { fetchResult, ApiRequestError } from "@/services/api";
import { mockBudget, mockWeather } from "@/services/mockBudget";
import { formatDistance, formatMinutes } from "@/utils/format";
import type { TripPlace, TripPlan, TripResult } from "@/types/trip";

const MapView = lazy(() =>
  import("@/components/detail/MapView").then((m) => ({ default: m.MapView })),
);

export default function PlanDetailPage() {
  const { resultId, planId } = useParams<{ resultId: string; planId: string }>();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job_id");
  const jobQuery = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  const navigate = useNavigate();
  const storeResult = useTripStore((s) => s.result);
  const setResult = useTripStore((s) => s.setResult);
  const selectedDay = useTripStore((s) => s.selectedDay);
  const selectDay = useTripStore((s) => s.selectDay);

  const [fetchedResult, setFetchedResult] = useState<TripResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlaceId, setActivePlaceId] = useState<number | null>(null);
  const [detailPlace, setDetailPlace] = useState<TripPlace | null>(null);

  const result = storeResult ?? fetchedResult;

  useEffect(() => {
    if (storeResult || fetchedResult || !resultId) return;
    setLoading(true);
    fetchResult(resultId, jobId ?? "")
      .then((data) => { setFetchedResult(data); setResult(data); })
      .catch((err) => { setError(err instanceof ApiRequestError ? err.message : "加载失败"); })
      .finally(() => setLoading(false));
  }, [resultId, jobId, storeResult, fetchedResult, setResult]);

  const plan: TripPlan | undefined = result?.plans.find((p) => p.plan_id === planId);
  const effectiveDay = selectedDay || plan?.days[0]?.day || 1;
  const currentDay = plan?.days.find((d) => d.day === effectiveDay) ?? plan?.days[0];

  const people = result?.request.people_count ?? 1;
  const budget = useMemo(() => (plan ? mockBudget(plan, people) : null), [plan, people]);
  const weather = useMemo(
    () => (result ? mockWeather(result.city.name, plan?.days.length ?? 5) : null),
    [result, plan],
  );

  // 今日行程概览（真实数据：里程/用时来自 commute_legs，景点数来自 places）
  const summary = useMemo(() => {
    if (!currentDay) return null;
    const meters = currentDay.commute_legs.reduce((s, l) => s + l.distance_meters, 0);
    const minutes = currentDay.commute_legs.reduce((s, l) => s + l.duration_minutes, 0);
    return {
      distance: formatDistance(meters),
      duration: formatMinutes(minutes),
      spots: currentDay.places.length,
      legs: currentDay.commute_legs.length,
    };
  }, [currentDay]);

  if (loading) return <DetailSkeleton />;

  if (error || !result || !plan || !currentDay || !budget || !weather) {
    return (
      <div className="empty-state animate-fade-in">
        <span className="empty-state-icon">📋</span>
        <p className="text-sm font-medium text-primary-700">{error ?? "方案未找到"}</p>
        <button onClick={() => navigate("/")} className="btn-primary mt-2">重新规划</button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-[#f8f9fa]">
      {/* 详情页标题条 */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/result/${resultId}${jobQuery}`)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-sand-500 transition-colors hover:bg-primary-50 hover:text-primary-600"
          >
            <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" /> 返回方案
          </button>
          <div>
            <h1 className="font-display text-lg font-bold text-gray-800">{plan.title}</h1>
            <p className="text-xs text-gray-500">
              {result.city.name} · {result.request.days}天 · {people}人
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
          <button className="flex items-center gap-1.5 transition-colors hover:text-primary-600">
            <i className="fa-solid fa-share-nodes" aria-hidden="true" /> 分享
          </button>
          <button className="flex items-center gap-1.5 transition-colors hover:text-primary-600">
            <i className="fa-regular fa-star" aria-hidden="true" /> 收藏
          </button>
        </div>
      </div>

      {/* 三栏 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左栏：预算 + 天气 + 导出 */}
        <aside className="hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-100 p-4 lg:flex">
          <BudgetCard data={budget} />
          <WeatherCard data={weather} />
          <button className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-700">
            <i className="fa-solid fa-download" aria-hidden="true" /> 导出行程
          </button>
        </aside>

        {/* 中栏：Day 标签 + 时间线 */}
        <section className="flex w-full shrink-0 flex-col border-r border-gray-100 bg-white md:w-[480px] xl:w-[560px]">
          <div className="hide-scrollbar flex shrink-0 gap-2 overflow-x-auto border-b border-gray-100 p-3">
            {plan.days.map((d) => {
              const active = effectiveDay === d.day;
              return (
                <button
                  key={d.day}
                  onClick={() => { selectDay(d.day); setActivePlaceId(null); }}
                  className={`flex min-w-[68px] shrink-0 flex-col items-center justify-center rounded-xl border px-1.5 py-2 transition-colors ${
                    active
                      ? "border-primary-600 bg-primary-600 text-white shadow-md"
                      : "border-gray-100 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-[13px] font-bold ${active ? "text-white" : "text-gray-800"}`}>
                    Day {d.day}
                  </span>
                  <span className={`mt-0.5 max-w-[60px] truncate text-[10px] ${active ? "text-primary-50" : "text-gray-400"}`}>
                    {d.title}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto">
            <Timeline day={currentDay} activePlaceId={activePlaceId} onPlaceClick={setDetailPlace} />
          </div>
        </section>

        {/* 右栏：地图占满 + 概览条 */}
        <section className="relative hidden flex-1 md:block">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-[#e3f0f5]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
              </div>
            }
          >
            <MapView day={currentDay} activePlaceId={activePlaceId} onMarkerClick={setActivePlaceId} />
          </Suspense>

          {/* 今日行程概览（真实数据） */}
          {summary && (
            <div className="absolute inset-x-5 bottom-5 z-10 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
              <h3 className="mb-3 px-2 text-sm font-bold text-gray-800">今日行程概览</h3>
              <div className="flex items-center justify-between px-2">
                <SummaryItem icon="fa-car-side" label="行驶" value={summary.distance} />
                <div className="h-8 w-px bg-gray-100" />
                <SummaryItem icon="fa-regular fa-clock" label="通勤" value={summary.duration} />
                <div className="h-8 w-px bg-gray-100" />
                <SummaryItem icon="fa-map-location-dot" label="景点" value={`${summary.spots}个`} />
                <div className="h-8 w-px bg-gray-100" />
                <SummaryItem icon="fa-route" label="路段" value={`${summary.legs}段`} />
              </div>
            </div>
          )}
        </section>
      </div>

      <PlaceDetailModal place={detailPlace} onClose={() => setDetailPlace(null)} />
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-[20px] text-primary-600 opacity-90">
        <i className={icon.startsWith("fa-regular") ? icon : `fa-solid ${icon}`} aria-hidden="true" />
      </div>
      <div className="flex flex-col justify-center">
        <span className="mb-0.5 text-[10px] font-medium text-gray-400">{label}</span>
        <span className="text-sm font-bold leading-none text-gray-800">{value}</span>
      </div>
    </div>
  );
}
