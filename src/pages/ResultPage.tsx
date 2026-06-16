import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PlanSummaryCard } from "@/components/result/PlanSummaryCard";
import { ResultSkeleton } from "@/components/skeleton/ResultSkeleton";
import { useTripStore } from "@/stores/tripStore";
import { fetchResult, ApiRequestError } from "@/services/api";
import { cityImageList } from "@/components/input/RotatingBackground";
import { saveRecentTrip } from "@/utils/recentTrip";
import type { TripResult } from "@/types/trip";

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

  // 记录最近行程，供首页「继续上次」找回
  useEffect(() => {
    if (result && resultId && jobId) {
      saveRecentTrip({
        resultId,
        jobId,
        city: result.city.name,
        days: result.request.days,
      });
    }
  }, [result, resultId, jobId]);

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
    <div className="relative min-h-screen">
      {/* 暖玻璃背景：城市图 + 暖白蒙版（与首页一套质感） */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-top"
        style={{ backgroundImage: `url('${images[0]}')` }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[rgba(255,251,245,0.85)] via-[rgba(238,249,247,0.92)] to-[#f3faf8]" />

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* 操作栏 */}
        <div className="mb-6 flex flex-wrap justify-end gap-2 sm:gap-3">
          <button
            disabled
            title="即将上线"
            className="flex items-center rounded-full border border-primary-100 bg-white/50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed opacity-70 sm:px-5"
          >
            <i className="fas fa-share-nodes mr-1.5 text-gray-300 sm:mr-2" aria-hidden="true" /> 分享
          </button>
          <button
            disabled
            title="即将上线"
            className="flex items-center rounded-full border border-primary-100 bg-white/50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed opacity-70 sm:px-5"
          >
            <i className="far fa-heart mr-1.5 text-gray-300 sm:mr-2" aria-hidden="true" /> 收藏
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
          <div className="inline-flex items-center rounded-full border border-primary-100/60 bg-white/70 px-4 py-1.5 text-sm text-gray-500 shadow-sm sm:text-base">
            <i className="fas fa-map-marker-alt mr-2 text-primary-600" aria-hidden="true" />
            {city.name} · {request.days}天 · {request.people_count}人
          </div>
        </div>

        {/* 方案卡片网格（拍立得风，依次淡入） */}
        <div className="stagger-fade mx-auto grid max-w-4xl grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
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

        {/* 手写签名收尾 */}
        <div className="mt-14 text-center">
          <p className="signature-font text-2xl text-primary-500 opacity-80">好行程，值得慢慢挑 ✦</p>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-gray-400">
            <i className="far fa-lightbulb text-gray-300" aria-hidden="true" />
            方案均由 AI 智能生成，可
            <button onClick={() => navigate("/")} className="font-medium text-primary-600 hover:underline">
              调整偏好
            </button>
            重新规划
          </p>
        </div>
      </main>
    </div>
  );
}
