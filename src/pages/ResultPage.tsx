import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlanSummaryCard } from "@/components/result/PlanSummaryCard";
import { ResultSkeleton } from "@/components/skeleton/ResultSkeleton";
import { useTripStore } from "@/stores/tripStore";
import { fetchResult, ApiRequestError } from "@/services/api";
import type { TripResult } from "@/types/trip";
import { CloudDecor } from "@/components/layout/CloudDecor";

export default function ResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const storeResult = useTripStore((s) => s.result);
  const setResult = useTripStore((s) => s.setResult);

  const [result, setLocal] = useState<TripResult | null>(storeResult);
  const [loading, setLoading] = useState(!storeResult);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result || !resultId) return;

    setLoading(true);
    fetchResult(resultId)
      .then((data) => {
        setLocal(data);
        setResult(data);
      })
      .catch((err) => {
        setError(
          err instanceof ApiRequestError ? err.message : "加载失败",
        );
      })
      .finally(() => setLoading(false));
  }, [resultId, result, setResult]);

  useEffect(() => {
    if (!result) return;
    if (result.plans.length === 1) {
      navigate(`/plan/${resultId}/${result.plans[0].plan_id}`, {
        replace: true,
      });
    }
  }, [result, resultId, navigate]);

  if (loading) return <ResultSkeleton />;

  if (error) {
    return (
      <div className="empty-state animate-fade-in">
        <span className="empty-state-icon">😵</span>
        <p className="text-sm font-medium text-primary-700">{error}</p>
        <button onClick={() => navigate("/")} className="btn-primary mt-2">
          重新规划
        </button>
      </div>
    );
  }

  if (!result || result.plans.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <span className="empty-state-icon">🗺️</span>
        <p className="empty-state-text">暂时无法生成方案，请稍后重试</p>
        <button onClick={() => navigate("/")} className="btn-primary mt-2">
          重新规划
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <CloudDecor intensity="light" />

      {/* 信息摘要条 */}
      <div className="mb-8 animate-fade-in">
        <h1 className="font-display text-center text-2xl font-bold tracking-tight text-primary-800 sm:text-3xl">
          为你生成了 {result.plans.length} 个方案
        </h1>
        <div className="mx-auto mt-4 flex max-w-lg flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-medium text-primary-700 shadow-sm backdrop-blur-sm">
            📍 {result.city.name}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-medium text-primary-700 shadow-sm backdrop-blur-sm">
            📅 {result.request.days}天
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-medium text-primary-700 shadow-sm backdrop-blur-sm">
            👥 {result.request.people_count}人
          </span>
          {result.request.preferences.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-medium text-primary-700 shadow-sm backdrop-blur-sm">
              🏷️ {result.request.preferences.join("、")}
            </span>
          )}
        </div>
      </div>

      {/* 方案卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-slide-up">
        {result.plans.map((plan, i) => (
          <PlanSummaryCard
            key={plan.plan_id}
            plan={plan}
            recommended={i === 0}
            onClick={() => navigate(`/plan/${resultId}/${plan.plan_id}`)}
          />
        ))}
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-sand-500 underline-offset-2 transition-colors hover:text-primary-600 hover:underline"
        >
          不满意？重新规划
        </button>
      </div>
    </div>
  );
}
