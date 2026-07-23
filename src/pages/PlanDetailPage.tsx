/**
 * 方案详情（杂志阅读流）
 * 路由：/plan/:resultId/:planId
 * 旧三栏详情见 PlanDetailClassicPage（/demo/detail-classic）
 */
import { useEffect, useMemo, useState, lazy, Suspense, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DetailSkeleton } from "@/components/skeleton/DetailSkeleton";
import { PlaceDetailModal } from "@/components/detail/PlaceDetailModal";
import { ShareDialog } from "@/components/share/ShareDialog";
import { useTripStore } from "@/stores/tripStore";
import { fetchResult, ApiRequestError } from "@/services/api";
import { mockBudget } from "@/services/mockBudget";
import { useArtifact } from "@/hooks/useArtifact";
import { saveBlob } from "@/utils/download";
import { showToast } from "@/stores/toastStore";
import { getCityPhotoUrls } from "@/components/input/RotatingBackground";
import { weatherIcon } from "@/constants/weather";
import {
  formatDistance,
  formatMinutes,
  commuteModeName,
  commuteModeIcon,
} from "@/utils/format";
import { timePreferencesLabel } from "@/utils/schedule";
import { categoryIcon, categoryName, isAnchorRole } from "@/constants/places";
import type { TripDay, TripPlace, TripPlan, TripResult, WeatherDay } from "@/types/trip";

gsap.registerPlugin(ScrollTrigger);

const MapView = lazy(() =>
  import("@/components/detail/MapView").then((m) => ({ default: m.MapView })),
);

const PACE_LABEL: Record<string, string> = {
  RELAXED: "轻松",
  MODERATE: "适中",
  INTENSIVE: "紧凑",
  PACKED: "紧凑",
};

const PERIOD_LABEL: Record<string, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "傍晚",
  night: "夜间",
};

function placeTimeLabel(place: TripPlace): string | null {
  const s = place.schedule;
  if (!s) return null;
  if (s.exact_start) {
    return s.exact_end ? `${s.exact_start} – ${s.exact_end}` : s.exact_start;
  }
  if (s.period && PERIOD_LABEL[s.period]) return PERIOD_LABEL[s.period];
  return null;
}

function dayWeatherLabel(
  day: number,
  weatherDays: WeatherDay[] | undefined,
): string | null {
  const w = weatherDays?.find((d) => d.day === day);
  if (!w) return null;
  return `${weatherIcon(w.icon_code)} ${w.temp_max_c}°C`;
}

export default function PlanDetailPage() {
  const { resultId, planId } = useParams<{ resultId: string; planId: string }>();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job_id");
  const jobQuery = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  const navigate = useNavigate();
  const storeResult = useTripStore((s) => s.result);
  const setResult = useTripStore((s) => s.setResult);

  const [fetchedResult, setFetchedResult] = useState<TripResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    kind: "notfound" | "unsupported" | "generic";
    message: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [showMap, setShowMap] = useState(false);
  const [mapDay, setMapDay] = useState(1);
  const [activePlaceId, setActivePlaceId] = useState<number | null>(null);
  const [detailPlace, setDetailPlace] = useState<TripPlace | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pdf = useArtifact(resultId, "pdf");

  const matched =
    storeResult &&
    storeResult.resultId === resultId &&
    storeResult.jobId === (jobId ?? "");
  const result = matched ? storeResult.data : fetchedResult;

  useEffect(() => {
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
          if (err.status === 404) {
            setError({ kind: "notfound", message: "攻略不存在" });
          } else if (
            err.status === 422 &&
            err.code === "RESULT_CONTRACT_UNSUPPORTED"
          ) {
            setError({
              kind: "unsupported",
              message: "该攻略由旧版本生成，暂不支持打开，请重新生成",
            });
          } else {
            setError({ kind: "generic", message: err.message });
          }
        } else {
          setError({ kind: "generic", message: "加载失败" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resultId, jobId, setResult]);

  const plan: TripPlan | undefined = result?.plans.find(
    (p) => p.plan_id === planId,
  );
  const people = result?.request.people_count ?? 1;
  const budget = useMemo(
    () => (plan ? mockBudget(plan, people) : null),
    [plan, people],
  );
  const city = result?.city.name ?? "";
  const cityCovers = useMemo(
    () => (city ? getCityPhotoUrls(city, 4) : []),
    [city],
  );
  const weatherDays =
    result?.weather?.status === "ok" && result.weather.days.length > 0
      ? result.weather.days
      : undefined;
  const timePrefText = result
    ? timePreferencesLabel(result.schema_version, result.time_preferences)
    : null;

  const dayForMap: TripDay | undefined =
    plan?.days.find((d) => d.day === mapDay) ?? plan?.days[0];

  // plan 就绪后，初始化地图日
  useEffect(() => {
    if (plan?.days[0]?.day != null) setMapDay(plan.days[0].day);
  }, [plan?.plan_id]);

  // GSAP 微动效（数据就绪后绑定）
  useEffect(() => {
    if (loading || !plan) return;
    const timeout = setTimeout(() => {
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".reveal-up").forEach((el) => {
          gsap.fromTo(
            el,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            },
          );
        });
        gsap.utils.toArray<HTMLElement>(".parallax-img").forEach((img) => {
          gsap.to(img, {
            y: "15%",
            ease: "none",
            scrollTrigger: {
              trigger: img.parentElement,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });
      }, containerRef);
      return () => ctx.revert();
    }, 100);
    return () => clearTimeout(timeout);
  }, [loading, plan?.plan_id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showMap) setShowMap(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMap]);

  const pdfReset = pdf.reset;
  useEffect(() => {
    if (pdf.phase === "ready" && pdf.blob && pdf.artifact) {
      saveBlob(pdf.blob, pdf.artifact.filename);
      showToast("PDF 已导出");
      pdfReset();
    }
  }, [pdf.phase, pdf.blob, pdf.artifact, pdfReset]);

  useEffect(() => {
    if (pdf.phase === "failed") {
      showToast(pdf.error?.message ?? "导出失败，请重试", "error");
    }
  }, [pdf.phase, pdf.error]);

  // scroll spy
  useEffect(() => {
    if (!plan) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          setActiveTab(id);
          if (id.startsWith("day-")) {
            const n = Number(id.replace("day-", ""));
            if (!Number.isNaN(n)) setMapDay(n);
          }
        });
      },
      { rootMargin: "-120px 0px -50% 0px", threshold: 0 },
    );
    const ids = [
      "overview",
      ...plan.days.map((d) => `day-${d.day}`),
      "budget",
      ...(result?.must_include?.length ? ["must-include"] : []),
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [plan, result?.must_include?.length]);

  function scrollTo(id: string) {
    setActiveTab(id);
    if (id.startsWith("day-")) {
      const n = Number(id.replace("day-", ""));
      if (!Number.isNaN(n)) setMapDay(n);
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openPlace(placeId: number) {
    if (!plan) return;
    setActivePlaceId(placeId);
    const found =
      plan.days.flatMap((d) => d.places).find((p) => p.place_id === placeId) ??
      null;
    if (found) {
      setShowMap(false);
      setDetailPlace(found);
    }
  }

  if (loading) return <DetailSkeleton />;

  if (error || !result || !plan || !budget) {
    const kind = error?.kind ?? "generic";
    const icon =
      kind === "notfound" ? "🔍" : kind === "unsupported" ? "🕰️" : "📋";
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

  const backPath =
    result.plans.length > 1
      ? `/result/${resultId}${jobQuery}`
      : `/`;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-sand-50 font-body text-gray-800 selection:bg-primary-100"
    >
      {/* 顶栏 */}
      <nav className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-10">
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="text-sm font-medium text-primary-700 transition-opacity hover:opacity-70"
        >
          ← {result.plans.length > 1 ? "返回方案" : "返回首页"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="返回云途首页"
          className="flex items-center gap-1.5 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 rounded"
        >
          <img src="/logo.svg" alt="" className="h-5 w-5" aria-hidden="true" />
          <span className="font-display text-xs tracking-[0.18em] text-primary-600/80">
            云途 · 路书
          </span>
        </button>
      </nav>

      {/* Hero */}
      <header
        id="overview"
        className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-12 pt-28 text-center sm:px-8 sm:pt-32 reveal-up"
      >
        <p className="mb-3 text-xs font-medium tracking-widest text-primary-600">
          {city}
          {result.request.days ? ` · ${result.request.days} 天` : ""}
          {people ? ` · ${people} 人` : ""}
          {timePrefText ? ` · ${timePrefText}` : ""}
        </p>
        <h1 className="font-display mb-4 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl">
          {plan.title}
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
          {plan.summary}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {plan.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-primary-200 bg-primary-50/80 px-3 py-1 text-xs font-medium text-primary-700"
            >
              {tag}
            </span>
          ))}
          {plan.pace?.level && (
            <span className="rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700">
              节奏 {PACE_LABEL[plan.pace.level] ?? plan.pace.level}
            </span>
          )}
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500">
            {plan.days.length} 日行程
          </span>
        </div>
      </header>

      {/* Sticky 导航 */}
      <div className="sticky top-0 z-40 bg-sand-50/80 shadow-sm shadow-gray-900/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto hide-scrollbar py-3.5 pr-4">
            {(
              [
                ["overview", "概览"],
                ...plan.days.map(
                  (d) =>
                    [`day-${d.day}`, `第 ${d.day} 天`] as [string, string],
                ),
                ["budget", "预算"],
                ...(result.must_include?.length
                  ? ([["must-include", "必去"]] as [string, string][])
                  : []),
              ] as [string, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={`rounded-full px-4 py-1.5 text-[11px] font-bold tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
                  activeTab === id
                    ? "bg-gray-900 text-white shadow-md"
                    : "text-gray-400 hover:bg-gray-200/50 hover:text-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-2 flex shrink-0 items-center gap-3 border-l border-gray-200/60 pl-5">
            <button
              type="button"
              className="hidden h-8 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-[11px] font-bold tracking-wide text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex"
              title="导出 PDF"
              disabled={pdf.loading}
              onClick={() => pdf.start()}
            >
              <i
                className={`fas ${pdf.loading ? "fa-spinner fa-spin" : "fa-file-pdf"} text-gray-400`}
                aria-hidden="true"
              />
              <span>{pdf.loading ? "导出中" : "PDF"}</span>
            </button>
            <button
              type="button"
              className="flex h-8 items-center justify-center gap-2 rounded-full bg-primary-600 px-5 text-[11px] font-bold tracking-wide text-white shadow-md shadow-primary-600/20 transition-all hover:scale-105 hover:bg-primary-700"
              title="分享 AI 长图"
              onClick={() => setShareOpen(true)}
            >
              <i className="fas fa-sparkles text-primary-200" aria-hidden="true" />
              <span>分享 AI 长图</span>
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-24 px-5 py-10 pb-36 sm:px-8 sm:py-14">
        {plan.days.map((day, dayIndex) => {
          const weatherLabel = dayWeatherLabel(day.day, weatherDays);
          return (
            <section
              key={day.day}
              id={`day-${day.day}`}
              className="scroll-mt-24"
            >
              <div className="mb-8 reveal-up">
                <div className="mb-5 flex flex-col items-start gap-1.5">
                  <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    第 {String(day.day).padStart(2, "0")} 天
                    {weatherLabel && (
                      <>
                        <span className="mx-1 text-gray-300">|</span>
                        {weatherLabel}
                      </>
                    )}
                  </span>
                  <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                    {day.title}
                  </h2>
                </div>
                {cityCovers.length > 0 && (
                  <div className="mb-5 aspect-[2.2/1] w-full overflow-hidden rounded-2xl shadow-soft">
                    <img
                      src={cityCovers[dayIndex % cityCovers.length]}
                      alt={`${city} 第 ${day.day} 天`}
                      loading={dayIndex === 0 ? "eager" : "lazy"}
                      className="parallax-img -mt-[10%] h-[120%] w-full object-cover"
                    />
                  </div>
                )}
                {day.narrative && (
                  <div className="relative my-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white p-5 shadow-xs">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-800 uppercase">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-white shadow-xs">
                        <i className="fa-solid fa-compass text-[10px]" aria-hidden="true" />
                      </span>
                      <span>当日游玩指引 · 精选路线要领</span>
                    </div>
                    <p className="text-sm sm:text-base leading-relaxed text-gray-700 font-medium">
                      {day.narrative}
                    </p>
                    {day.commute_summary && (
                      <div className="mt-3 flex items-center gap-2 border-t border-emerald-100/80 pt-2.5 text-xs text-emerald-700 font-medium">
                        <i className="fas fa-route text-emerald-500" aria-hidden="true" />
                        <span>全天出行参考：{day.commute_summary}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-6">
                {day.places.map((place, placeIndex) => {
                  const nextLeg = day.commute_legs?.find(
                    (l) => l.from_place_id === place.place_id,
                  );
                  const timeLabel = placeTimeLabel(place);
                  const isLast = placeIndex === day.places.length - 1;
                  const anchor = isAnchorRole(place.role);

                  return (
                    <div key={place.place_id} className="relative reveal-up">
                      {/* 时间轴竖连线 */}
                      {!isLast && (
                        <div
                          className="absolute left-6 top-14 bottom-0 w-0.5 bg-gradient-to-b from-primary-200 via-gray-200 to-transparent"
                          aria-hidden="true"
                        />
                      )}

                      {/* 景点节点卡片 */}
                      <div
                        onClick={() => openPlace(place.place_id)}
                        className={`group relative flex flex-col rounded-2xl border transition-all duration-200 p-5 cursor-pointer ${
                          activePlaceId === place.place_id
                            ? "border-primary-400 bg-primary-50/40 shadow-md ring-2 ring-primary-300/50"
                            : "border-gray-200/80 bg-white hover:border-primary-200 hover:shadow-md"
                        }`}
                      >
                        {/* 头部：序号 + 标题 + 右侧富属性徽标 */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold shadow-xs ${
                                anchor
                                  ? "bg-gradient-to-br from-primary-600 to-emerald-600 text-white"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {String(placeIndex + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-base" aria-hidden="true">
                                  {categoryIcon(place.category)}
                                </span>
                                <h3 className="truncate text-lg font-bold text-gray-900 transition-colors group-hover:text-primary-700">
                                  {place.name}
                                </h3>
                                {place.optional && (
                                  <span className="shrink-0 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                    可选
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {categoryName(place.category)}
                              </span>
                            </div>
                          </div>

                          {/* 右侧卡片徽标区 */}
                          <div className="flex items-center gap-2">
                            {timeLabel && (
                              <span className="rounded-lg bg-primary-50 border border-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
                                {timeLabel}
                              </span>
                            )}
                            {place.stay_minutes ? (
                              <span className="flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                <i className="fa-regular fa-clock text-primary-500" />
                                约 {place.stay_minutes} 分钟
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                                <i className="fa-solid fa-location-dot text-primary-400" />
                                景点打卡
                              </span>
                            )}
                            <span className="ml-1 text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex items-center gap-0.5">
                              详情 <i className="fa-solid fa-chevron-right text-[10px]" />
                            </span>
                          </div>
                        </div>

                        {/* 详情与说明描述 */}
                        {(place.brief || place.activity_note) && (
                          <div className="mt-3 border-t border-gray-100/80 pt-3 text-sm leading-relaxed">
                            {place.activity_note ? (
                              <p className="font-normal text-gray-700">{place.activity_note}</p>
                            ) : (
                              <p className="text-gray-500">{place.brief}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 交通连接胶囊 */}
                      {nextLeg && (
                        <div className="my-3.5 ml-6 flex items-center gap-3">
                          <div className="flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50/80 px-3.5 py-1.5 text-xs font-medium text-primary-800 shadow-2xs backdrop-blur-xs">
                            <i className={`fa-solid ${commuteModeIcon(nextLeg.mode)} text-primary-500`} />
                            <span>
                              {commuteModeName(nextLeg.mode)} {formatMinutes(nextLeg.duration_minutes)}
                            </span>
                            <span className="text-primary-300">·</span>
                            <span className="text-primary-600/80">
                              {formatDistance(nextLeg.distance_meters)}
                            </span>
                          </div>
                          {nextLeg.transit_summary && (
                            <span className="text-xs text-gray-400 truncate max-w-xs">
                              {nextLeg.transit_summary}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* 预算 */}
        <section
          id="budget"
          className="scroll-mt-24 border-t border-primary-100/50 pt-6 reveal-up"
        >
          <h2 className="font-display mb-8 text-3xl font-bold text-gray-900">
            预算参考
          </h2>
          <div className="pl-1 sm:pl-2">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-gray-400">
              估算合计 · {budget.people} 人
            </p>
            <div className="mb-3 font-display text-5xl font-light tabular-nums tracking-tight text-gray-900 sm:text-6xl">
              <span className="mr-1 text-3xl text-gray-400">¥</span>
              {budget.total.toLocaleString()}
            </div>
            <p className="mb-10 text-xs tabular-nums text-gray-500">
              参考总预算 ¥ {budget.budgetCap.toLocaleString()} · 约占{" "}
              {budget.usedPercent}%
            </p>
            <div className="space-y-5">
              {budget.breakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-4 border-b border-gray-200/60 pb-4 text-sm last:border-0"
                >
                  <i
                    className={`fa-solid ${item.icon} w-5 text-center text-primary-300/80`}
                    aria-hidden="true"
                  />
                  <span className="w-16 tracking-wide text-gray-500">
                    {item.label}
                  </span>
                  <div className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-gray-100/80">
                    <div
                      className="h-1 rounded-full bg-primary-400"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="w-20 text-right font-mono text-gray-800">
                    ¥ {item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-8 text-[11px] uppercase tracking-wide text-gray-400">
              预算为估算参考，实际花费以出行为准
            </p>
          </div>
        </section>

        {/* 必去落实 */}
        {result.must_include && result.must_include.length > 0 && (
          <section
            id="must-include"
            className="scroll-mt-24 border-t border-primary-100/50 pb-8 pt-6 reveal-up"
          >
            <h2 className="font-display mb-6 text-3xl font-bold text-gray-900">
              必去地点落实
            </h2>
            <ul className="space-y-4 pl-1 sm:pl-2">
              {result.must_include.map((item) => {
                const ok = item.status === "scheduled";
                const badge =
                  item.status === "scheduled"
                    ? "已排入"
                    : item.status === "cross_city"
                      ? "跨城"
                      : "未排入";
                return (
                  <li
                    key={item.name}
                    className="flex items-start gap-4 border-b border-gray-200/60 pb-4 last:border-0"
                  >
                    <span
                      className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        ok
                          ? "bg-primary-50 text-primary-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {badge}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900">{item.name}</p>
                      {"reason" in item && item.reason && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>

      {/* 地图 FAB */}
      <div className="fixed bottom-8 right-5 z-50 flex flex-col items-end gap-3 sm:right-8">
        <button
          type="button"
          onClick={() => {
            setShowMap(true);
            setActivePlaceId(dayForMap?.places[0]?.place_id ?? null);
          }}
          className="flex items-center gap-2.5 rounded-full bg-primary-600 py-3.5 pl-5 pr-6 text-white shadow-xl shadow-primary-600/25 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
        >
          <i
            className="fas fa-map-marked-alt text-primary-100"
            aria-hidden="true"
          />
          <span className="text-xs font-bold tracking-wide">查看地图</span>
        </button>
      </div>

      {/* 地图浮层 */}
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 sm:p-6 ${
          showMap
            ? "pointer-events-auto bg-gray-900/60 opacity-100 backdrop-blur-sm"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!showMap}
      >
        <div
          className={`flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-gray-800 shadow-2xl transition-transform duration-300 ${
            showMap ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="z-10 flex items-center justify-between gap-3 border-b border-white/5 bg-gray-900/60 px-6 py-4 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-4">
              <h3 className="font-display truncate text-lg font-medium text-white">
                {city} 地图
              </h3>
              <div className="hidden flex-wrap gap-1.5 border-l border-white/10 pl-4 sm:flex">
                {plan.days.map((d) => (
                  <button
                    type="button"
                    key={d.day}
                    onClick={() => setMapDay(d.day)}
                    tabIndex={showMap ? 0 : -1}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      mapDay === d.day
                        ? "bg-primary-500 text-white"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    第 {d.day} 天
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMap(false)}
              tabIndex={showMap ? 0 : -1}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:scale-105 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="关闭地图"
            >
              <i className="fas fa-times" aria-hidden="true" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-white/5 bg-gray-900/40 px-4 py-3 hide-scrollbar sm:hidden">
            {plan.days.map((d) => (
              <button
                type="button"
                key={d.day}
                onClick={() => setMapDay(d.day)}
                tabIndex={showMap ? 0 : -1}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  mapDay === d.day
                    ? "bg-primary-500 text-white"
                    : "bg-white/5 text-white/50"
                }`}
              >
                第 {d.day} 天
              </button>
            ))}
          </div>

          <div className="relative min-h-0 flex-1 bg-gray-800">
            {dayForMap && (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm uppercase tracking-widest text-white/40">
                    地图加载中…
                  </div>
                }
              >
                <MapView
                  day={dayForMap}
                  activePlaceId={activePlaceId}
                  onMarkerClick={(id) => openPlace(id)}
                />
              </Suspense>
            )}
          </div>

          <div className="border-t border-white/5 bg-gray-900/60 px-6 py-2 backdrop-blur-md">
            <p className="text-center text-[10px] uppercase tracking-widest text-white/40">
              点击标记查看地点详情
            </p>
          </div>
        </div>
      </div>

      <PlaceDetailModal
        place={detailPlace}
        onClose={() => setDetailPlace(null)}
      />
      {resultId && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          recordId={resultId}
        />
      )}
    </div>
  );
}
