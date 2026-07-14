import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Timeline } from "@/components/detail/Timeline";
import { DetailSkeleton } from "@/components/skeleton/DetailSkeleton";
import { PlaceDetailModal } from "@/components/detail/PlaceDetailModal";
import { BudgetCard } from "@/components/detail/BudgetCard";
import { WeatherCard } from "@/components/detail/WeatherCard";
import { MustIncludeCard } from "@/components/detail/MustIncludeCard";
import { ShareDialog } from "@/components/share/ShareDialog";
import { useTripStore } from "@/stores/tripStore";
import { fetchResult, ApiRequestError } from "@/services/api";
import { mockBudget } from "@/services/mockBudget";
import { useArtifact } from "@/hooks/useArtifact";
import { saveBlob } from "@/utils/download";
import { showToast } from "@/stores/toastStore";
import { formatDistance, formatMinutes, commuteModeIcon } from "@/utils/format";
import { timePreferencesLabel } from "@/utils/schedule";
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
  // 初始即处于加载态（除非稍后 effect 命中缓存），避免直连 URL 首帧闪现"方案未找到"
  const [loading, setLoading] = useState(true);
  // 结果加载错误：notfound=攻略不存在(404)；unsupported=旧版本生成不兼容(422)；generic=其他
  const [error, setError] = useState<{ kind: "notfound" | "unsupported" | "generic"; message: string } | null>(null);
  const [activePlaceId, setActivePlaceId] = useState<number | null>(null);
  const [detailPlace, setDetailPlace] = useState<TripPlace | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const pdf = useArtifact(resultId, "pdf");
  // 窄屏单栏切换：行程 / 地图 / 概览（桌面端忽略，始终三栏并排）
  const [mobileTab, setMobileTab] = useState<"itinerary" | "map" | "overview">("itinerary");

  // store 缓存仅在 resultId+jobId 与当前 URL 一致时复用，否则强制 fetch，
  // 防止上一条 job 的方案污染当前详情页
  const matched =
    storeResult &&
    storeResult.resultId === resultId &&
    storeResult.jobId === (jobId ?? "");

  const result = matched ? storeResult.data : fetchedResult;

  useEffect(() => {
    // resultId/jobId 变化时重置本地态并取消旧请求，防止组件复用时旧数据/慢响应污染新页面。
    // 缓存命中用 getState() 读、不订阅 matched：否则 fetch 成功写 store 会翻转 matched
    // 触发本 effect 重跑，cleanup 把 cancelled 置 true，finally 里 setLoading(false) 被跳过，骨架屏卡死
    setError(null);
    const cached = useTripStore.getState().result;
    const hit =
      cached && cached.resultId === resultId && cached.jobId === (jobId ?? "");
    if (hit) {
      setFetchedResult(cached.data);
      setLoading(false);
      return;
    }
    setFetchedResult(null);
    if (!resultId) return;

    let cancelled = false;
    setLoading(true);
    fetchResult(resultId, jobId ?? "")
      .then((data) => {
        if (cancelled) return;
        setFetchedResult(data);
        setResult(resultId, jobId ?? "", data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiRequestError) {
          // 404 攻略不存在；422 + RESULT_CONTRACT_UNSUPPORTED 旧版本生成不兼容（v0.8.3 契约）
          if (err.status === 404) {
            setError({ kind: "notfound", message: "攻略不存在" });
          } else if (err.status === 422 && err.code === "RESULT_CONTRACT_UNSUPPORTED") {
            setError({ kind: "unsupported", message: "该攻略由旧版本生成，暂不支持打开，请重新生成" });
          } else {
            setError({ kind: "generic", message: err.message });
          }
        } else {
          setError({ kind: "generic", message: "加载失败" });
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resultId, jobId, setResult]);

  // selectedDay 跨行程残留校验：上个行程选了 Day 3，新行程只有 2 天时回退 Day 1
  const plan: TripPlan | undefined = result?.plans.find((p) => p.plan_id === planId);
  const dayValid = plan?.days.some((d) => d.day === selectedDay);
  const effectiveDay = (dayValid ? selectedDay : 0) || plan?.days[0]?.day || 1;
  const currentDay = plan?.days.find((d) => d.day === effectiveDay) ?? plan?.days[0];

  const people = result?.request.people_count ?? 1;
  const budget = useMemo(() => (plan ? mockBudget(plan, people) : null), [plan, people]);
  // 天气来自后端 TripResult.weather。有数据则渲染预报；status 非 ok（日期太远/未开启等）
  // 渲染友好说明而非整卡消失，让用户知道"为什么没有天气"
  const weather = result?.weather ?? null;

  // 今日行程概览（真实数据：里程/用时来自 commute_legs，景点数来自 places）
  const summary = useMemo(() => {
    if (!currentDay) return null;
    const meters = currentDay.commute_legs.reduce((s, l) => s + l.distance_meters, 0);
    const minutes = currentDay.commute_legs.reduce((s, l) => s + l.duration_minutes, 0);
    // 当天主要出行方式：取各段里出现最多的 mode，用于概览「行驶」图标，
    // 避免固定车图标与实际公交/步行不符
    const modeCount = new Map<string, number>();
    for (const l of currentDay.commute_legs) {
      modeCount.set(l.mode, (modeCount.get(l.mode) ?? 0) + 1);
    }
    let mainMode = "driving";
    let max = 0;
    for (const [mode, count] of modeCount) {
      if (count > max) { max = count; mainMode = mode; }
    }
    return {
      distance: formatDistance(meters),
      duration: formatMinutes(minutes),
      spots: currentDay.places.length,
      legs: currentDay.commute_legs.length,
      mainMode,
    };
  }, [currentDay]);

  // PDF 就绪 → 下载并复位（复位后 phase 回 idle，不会重复触发）。
  // reset 是 useArtifact 内的稳定 useCallback，单独取出以满足 exhaustive-deps
  const pdfReset = pdf.reset;
  useEffect(() => {
    if (pdf.phase === "ready" && pdf.blob && pdf.artifact) {
      saveBlob(pdf.blob, pdf.artifact.filename);
      showToast("PDF 已导出");
      pdfReset();
    }
  }, [pdf.phase, pdf.blob, pdf.artifact, pdfReset]);

  // PDF 生成失败 → 提示（保持 failed 态，用户可再次点击导出重试）
  useEffect(() => {
    if (pdf.phase === "failed") {
      showToast(pdf.error?.message ?? "导出失败，请重试", "error");
    }
  }, [pdf.phase, pdf.error]);

  // 时间偏好徽标：1.5 无偏好显式"无固定时间"；1.4 缺字段不展示（不伪造）
  const timePrefText = result
    ? timePreferencesLabel(result.schema_version, result.time_preferences)
    : null;

  if (loading) return <DetailSkeleton />;

  if (error || !result || !plan || !currentDay || !budget) {
    const kind = error?.kind ?? "generic";
    const icon = kind === "notfound" ? "🔍" : kind === "unsupported" ? "🕰️" : "📋";
    const message = error?.message ?? "方案未找到";
    return (
      <div className="empty-state animate-fade-in">
        <span className="empty-state-icon">{icon}</span>
        <p className="max-w-xs text-sm font-medium text-primary-700">{message}</p>
        <button onClick={() => navigate("/")} className="btn-primary mt-2">
          {kind === "unsupported" ? "重新生成" : "重新规划"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh_-_3.5rem)] flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* 详情页标题条 */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 bg-white px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {result.plans.length > 1 && (
            <button
              onClick={() => navigate(`/result/${resultId}${jobQuery}`)}
              aria-label="返回方案"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-sand-500 transition-colors hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            >
              <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true" />
              <span className="hidden sm:inline">返回方案</span>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold text-gray-800 sm:text-lg">{plan.title}</h1>
            <p className="truncate text-xs text-gray-500">
              {result.city.name} · {result.request.days}天 · {people}人
              {timePrefText ? ` · ${timePrefText}` : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-gray-600 sm:gap-4">
          <button aria-label="分享" onClick={() => setShareOpen(true)} className="flex items-center gap-1.5 rounded-lg p-2 text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 sm:p-0">
            <i className="fa-solid fa-share-nodes" aria-hidden="true" /> <span className="hidden sm:inline">分享</span>
          </button>
          <button aria-label="收藏（即将上线）" disabled title="即将上线" className="flex items-center gap-1.5 rounded-lg p-2 text-gray-400 cursor-not-allowed opacity-60 sm:p-0">
            <i className="fa-regular fa-star" aria-hidden="true" /> <span className="hidden sm:inline">收藏</span>
          </button>
        </div>
      </div>

      {/* 窄屏/平板 Tab 切换（≥lg 隐藏，始终三栏并排） */}
      <div role="tablist" aria-label="详情视图" className="flex shrink-0 border-b border-gray-100 bg-white lg:hidden">
        {([
          ["itinerary", "fa-route", "行程"],
          ["map", "fa-map-location-dot", "地图"],
          ["overview", "fa-wallet", "概览"],
        ] as const).map(([key, icon, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={mobileTab === key}
            aria-controls={`tabpanel-${key}`}
            onClick={() => setMobileTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-300 ${
              mobileTab === key
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500"
            }`}
          >
            <i className={`fa-solid ${icon} text-xs`} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {/* 三栏（桌面）/ 单栏切换（窄屏） */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左栏：预算 + 天气 + 导出 —— 桌面常驻；窄屏归入「概览」Tab */}
        <aside
          id="tabpanel-overview"
          role="tabpanel"
          className={`w-full shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-100 p-4 lg:flex lg:w-[300px] ${
            mobileTab === "overview" ? "flex" : "hidden"
          }`}
        >
          <BudgetCard data={budget} />
          {result.must_include && result.must_include.length > 0 && (
            <MustIncludeCard items={result.must_include} />
          )}
          {weather && <WeatherCard data={weather} activeDay={effectiveDay} />}
          <button
            onClick={pdf.start}
            disabled={pdf.loading}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            <i className={pdf.loading ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-download"} aria-hidden="true" />
            {pdf.loading ? "正在导出..." : "导出行程"}
          </button>
        </aside>

        {/* 中栏：Day 标签 + 时间线 —— 桌面常驻；窄屏「行程」Tab */}
        <section
          id="tabpanel-itinerary"
          role="tabpanel"
          className={`w-full shrink-0 flex-col border-r border-gray-100 bg-white lg:flex lg:w-[480px] xl:w-[560px] ${
            mobileTab === "itinerary" ? "flex" : "hidden"
          }`}
        >
          <div className="hide-scrollbar flex shrink-0 gap-2 overflow-x-auto border-b border-gray-100 p-3">
            {plan.days.map((d) => {
              const active = effectiveDay === d.day;
              return (
                <button
                  key={d.day}
                  onClick={() => { selectDay(d.day); setActivePlaceId(null); }}
                  className={`flex min-w-[68px] shrink-0 flex-col items-center justify-center rounded-xl border px-1.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
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
            <Timeline
              day={currentDay}
              activePlaceId={activePlaceId}
              onPlaceClick={(place) => {
                setActivePlaceId(place.place_id);
                setDetailPlace(place);
              }}
            />
          </div>
        </section>

        {/* 右栏：地图占满 + 概览条 —— 桌面常驻；窄屏「地图」Tab */}
        <section id="tabpanel-map" role="tabpanel" className={`relative flex-1 lg:block ${mobileTab === "map" ? "block" : "hidden"}`}>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
              </div>
            }
          >
            <MapView day={currentDay} activePlaceId={activePlaceId} onMarkerClick={setActivePlaceId} />
          </Suspense>

          {/* 今日行程概览（真实数据） */}
          {summary && (
            <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-white bg-white/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md sm:inset-x-5 sm:bottom-5 sm:p-4">
              <h3 className="mb-3 px-2 text-sm font-bold text-gray-800">今日行程概览</h3>
              <div className="flex items-center justify-between px-2">
                <SummaryItem icon={commuteModeIcon(summary.mainMode)} label="行驶" value={summary.distance} />
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
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} recordId={String(result.result_id)} />
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
