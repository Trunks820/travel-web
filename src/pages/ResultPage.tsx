import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PlanSummaryCard } from "@/components/result/PlanSummaryCard";
import { ResultSkeleton } from "@/components/skeleton/ResultSkeleton";
import { useTripStore } from "@/stores/tripStore";
import { fetchResult, ApiRequestError } from "@/services/api";
import { cityImageList } from "@/components/input/RotatingBackground";
import type { TripResult } from "@/types/trip";

const SUGGESTIONS = [
  { title: "本地美食地图", type: "美食指南", icon: "fa-utensils", tone: "bg-accent-50 text-accent-500" },
  { title: "周边一日游包车", type: "交通服务", icon: "fa-car", tone: "bg-blue-50 text-blue-500" },
  { title: "特色演出门票", type: "当地体验", icon: "fa-mask", tone: "bg-purple-50 text-purple-500" },
  { title: "市区精选酒店", type: "住宿推荐", icon: "fa-hotel", tone: "bg-primary-50 text-primary-600" },
];

export default function ResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job_id");
  const jobQuery = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  const navigate = useNavigate();
  const storeResult = useTripStore((s) => s.result);
  const setResult = useTripStore((s) => s.setResult);

  const [result, setLocal] = useState<TripResult | null>(storeResult);
  const [loading, setLoading] = useState(!storeResult);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result || !resultId) return;

    setLoading(true);
    fetchResult(resultId, jobId ?? "")
      .then((data) => {
        setLocal(data);
        setResult(data);
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "加载失败");
      })
      .finally(() => setLoading(false));
  }, [resultId, jobId, result, setResult]);

  useEffect(() => {
    if (!result) return;
    if (result.plans.length === 1) {
      navigate(`/plan/${resultId}/${result.plans[0].plan_id}${jobQuery}`, {
        replace: true,
      });
    }
  }, [result, resultId, navigate, jobQuery]);

  if (loading) return <ResultSkeleton />;

  if (error || !result || result.plans.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <span className="empty-state-icon">{error ? "😵" : "🗺️"}</span>
        <p className="text-sm font-medium text-primary-700">
          {error ?? "暂时无法生成方案，请稍后重试"}
        </p>
        <button onClick={() => navigate("/")} className="btn-primary mt-2">
          重新规划
        </button>
      </div>
    );
  }

  const { city, request, plans } = result;
  const images = cityImageList(city.name);

  return (
    <div className="relative min-h-screen bg-[#f1f5f9]">
      {/* 顶部渐变背景装饰 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-50 to-transparent" />

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* 操作栏 */}
        <div className="mb-6 flex flex-wrap justify-end gap-2 sm:gap-3">
          <button className="flex items-center rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 backdrop-blur transition-colors hover:bg-white sm:px-5">
            <i className="fas fa-share-nodes mr-1.5 text-gray-400 sm:mr-2" aria-hidden="true" /> 分享
          </button>
          <button className="flex items-center rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 backdrop-blur transition-colors hover:bg-white sm:px-5">
            <i className="far fa-heart mr-1.5 text-gray-400 sm:mr-2" aria-hidden="true" /> 收藏
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary-600 sm:px-5"
          >
            <i className="fas fa-sliders mr-1.5 sm:mr-2" aria-hidden="true" /> 调整偏好
          </button>
        </div>

        {/* 标题 */}
        <div className="mb-8 text-center animate-fade-in sm:mb-10">
          <h1 className="mb-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-2xl font-extrabold text-gray-800 sm:mb-5 sm:gap-3 sm:text-4xl">
            <span className="text-2xl text-primary-400 sm:text-3xl" aria-hidden="true">✦</span>
            为你生成了
            <span className="relative text-accent-500">
              {plans.length}
              <svg className="absolute -bottom-2 left-0 h-2 w-full text-accent-400/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0,5 Q50,10 100,5" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
            </span>
            个方案
          </h1>
          <div className="inline-flex items-center rounded-full border border-gray-100/50 bg-white/60 px-4 py-1.5 text-sm text-gray-500 shadow-sm sm:text-base">
            <i className="fas fa-map-marker-alt mr-2 text-primary-600" aria-hidden="true" />
            {city.name} · {request.days}天 · {request.people_count}人
          </div>
        </div>

        {/* 方案卡片网格 */}
        <div className="stagger grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <PlanSummaryCard
              key={plan.plan_id}
              plan={plan}
              image={images[i % images.length]}
              recommended={i === 0}
              index={i}
              onClick={() => navigate(`/plan/${resultId}/${plan.plan_id}${jobQuery}`)}
            />
          ))}
        </div>

        {/* 推荐区 */}
        <div className="mt-12">
          <h2 className="mb-6 flex items-center text-xl font-bold text-gray-800">
            <span className="mr-3 h-6 w-1.5 rounded-full bg-primary-500" />
            你可能还会感兴趣
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SUGGESTIONS.map((item) => (
              <div
                key={item.title}
                className="group cursor-pointer rounded-2xl border border-gray-100 bg-white/60 p-5 transition-all hover:bg-white hover:shadow-md"
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${item.tone}`}>
                  <i className={`fas ${item.icon}`} aria-hidden="true" />
                </div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {item.type}
                </div>
                <div className="text-sm font-bold text-gray-700">{item.title}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
          <i className="far fa-lightbulb text-gray-300" aria-hidden="true" />
          以上方案均为 AI 智能生成，您可以
          <button onClick={() => navigate("/")} className="font-medium text-primary-600 hover:underline">
            调整偏好
          </button>
          重新生成更多方案
        </div>
      </main>
    </div>
  );
}
