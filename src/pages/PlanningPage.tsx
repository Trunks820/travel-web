import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProgressTimeline } from "@/components/planning/ProgressTimeline";
import { BoardingPass } from "@/components/planning/BoardingPass";
import {
  RotatingBackground,
  useRotatingBackground,
} from "@/components/input/RotatingBackground";
import { useTripStore } from "@/stores/tripStore";
import { pollJobStatus, submitTrip, ApiRequestError } from "@/services/api";
import { usePolling } from "@/hooks/usePolling";
import { webErrorMessage } from "@/constants/errors";
import type { StageCode, JobResponse } from "@/types/trip";

export default function PlanningPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const setJob = useTripStore((s) => s.setJob);
  const formData = useTripStore((s) => s.formData);

  const destination = formData?.to_city ?? "目的地";
  const { current: bgImage, incoming: bgIncoming } = useRotatingBackground(
    destination ? [destination] : [],
    "static",
  );

  const [stageCode, setStageCode] = useState<StageCode | null>(null);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const fetcher = useCallback(() => pollJobStatus(jobId!), [jobId]);

  const onData = useCallback(
    (data: JobResponse): boolean => {
      if (data.stage_progress) {
        setStageCode(data.stage_progress.code);
        setJob(jobId!, data.status, data.stage_progress);
      }

      if (data.status === "COMPLETED" && data.result_record_id) {
        navigate(`/result/${data.result_record_id}?job_id=${jobId}`, {
          replace: true,
        });
        return true;
      }

      if (data.status === "FAILED") {
        setFailed(true);
        setErrorMessage(webErrorMessage(data.error?.code, data.error?.message));
        return true;
      }

      return false;
    },
    [jobId, navigate, setJob],
  );

  const onTimeout = useCallback(() => setTimedOut(true), []);

  const { stop } = usePolling({
    fetcher,
    onData,
    interval: 2500,
    maxAttempts: 144,
    onTimeout,
    enabled: !!jobId && !failed && !timedOut,
  });

  useEffect(() => () => stop(), [stop]);

  function handleRetry() {
    setFailed(false);
    setTimedOut(false);
    setErrorMessage(null);
    navigate("/");
  }

  async function handleRefresh() {
    if (!jobId) return;
    try {
      const data = await pollJobStatus(jobId);
      if (data.status === "COMPLETED" && data.result_record_id) {
        navigate(`/result/${data.result_record_id}?job_id=${jobId}`, {
          replace: true,
        });
      }
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "查询失败";
      setErrorMessage(msg);
    }
  }

  const [retrying, setRetrying] = useState(false);

  // 同参数原地重试：生成失败常是 LLM 偶发不稳定，相同参数重跑大概率成功，
  // 比回首页重填更顺。formData 来自 store（提交时已写入）。
  async function handleRetrySame() {
    if (!formData || retrying) return;
    setRetrying(true);
    setErrorMessage(null);
    try {
      const res = await submitTrip(formData);
      setFailed(false);
      setStageCode(null);
      navigate(`/planning/${res.job_id}`, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "重试失败，请稍后再试";
      setErrorMessage(msg);
    } finally {
      setRetrying(false);
    }
  }

  const title = failed
    ? "这次规划没能完成"
    : timedOut
      ? "生成时间比预期长"
      : `正在规划你的 ${destination} 之旅`;

  return (
    <div className="relative min-h-screen -mt-14 pt-14">
      <RotatingBackground current={bgImage} incoming={bgIncoming} />
      {/* 均匀白色蒙版，保证双栏内容可读 */}
      <div className="fixed inset-0 z-0 bg-white/55 pointer-events-none" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl grid-cols-1 items-center gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-2 lg:gap-12">
        {/* 左：进度 */}
        <div className="order-2 animate-slide-up lg:order-1">
          <h1 className="mb-2 text-2xl font-bold text-gray-800 sm:text-3xl xl:text-4xl">{title}</h1>
          <p className="mb-6 text-sm text-gray-600 sm:mb-10">
            {failed
              ? "可以调整需求后重新规划"
              : timedOut
                ? "请稍后刷新查看，或重新规划"
                : "AI 旅行管家正在逐步定制，通常需要 30-90 秒"}
          </p>

          <div aria-live="polite" aria-atomic="true">
            <ProgressTimeline currentCode={stageCode} failed={failed} />
          </div>

          {errorMessage && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {(failed || timedOut) && (
            <div className="mt-8 flex gap-3">
              {failed && (
                <button
                  onClick={handleRetrySame}
                  disabled={retrying || !formData}
                  className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2"
                >
                  {retrying ? "正在重试..." : "再试一次"}
                </button>
              )}
              <button
                onClick={handleRetry}
                className={
                  failed
                    ? "rounded-xl border border-primary-200 bg-white px-6 py-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                    : "rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2"
                }
              >
                重新规划
              </button>
              {timedOut && (
                <button
                  onClick={handleRefresh}
                  className="rounded-xl border border-primary-200 bg-white px-6 py-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                >
                  刷新查看
                </button>
              )}
            </div>
          )}

          {!failed && !timedOut && (
            <p className="mt-10 flex items-center gap-1.5 text-xs text-gray-500">
              <i className="fas fa-shield-alt" aria-hidden="true" />
              请勿关闭页面 · 完成后自动跳转
            </p>
          )}
        </div>

        {/* 右：登机牌 */}
        <div className="order-1 flex flex-col items-center justify-center animate-slide-up-delay-1 lg:order-2">
          <BoardingPass city={destination} formData={formData} />
          <p className="signature-font mt-6 -rotate-3 text-2xl text-primary-500 opacity-80 sm:mt-8">
            {failed ? "下次一定顺利" : "好行程值得稍等片刻"}
          </p>
        </div>
      </div>
    </div>
  );
}
