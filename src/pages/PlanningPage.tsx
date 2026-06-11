import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ProgressSteps } from "@/components/planning/ProgressSteps";
import { useTripStore } from "@/stores/tripStore";
import { pollJobStatus, ApiRequestError } from "@/services/api";
import { usePolling } from "@/hooks/usePolling";
import type { StageCode, JobResponse } from "@/types/trip";
import { CloudDecor } from "@/components/layout/CloudDecor";

export default function PlanningPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const setJob = useTripStore((s) => s.setJob);

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
        navigate(`/result/${data.result_record_id}`, { replace: true });
        return true;
      }

      if (data.status === "FAILED") {
        setFailed(true);
        setErrorMessage(data.error?.message ?? "生成失败，请重试");
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
    interval: 2000,
    maxAttempts: 90,
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
        navigate(`/result/${data.result_record_id}`, { replace: true });
      }
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "查询失败";
      setErrorMessage(msg);
    }
  }

  return (
    <div className="relative mx-auto max-w-sm text-center">
      <CloudDecor intensity="light" />
      <div className="card mx-auto w-full max-w-md px-6 py-10 sm:px-12 animate-slide-up">
        <h1 className="mb-2 font-display text-2xl font-bold text-primary-800">
          {failed ? "生成失败" : timedOut ? "生成时间较长" : "正在生成旅行方案"}
        </h1>
        <p className="mb-8 text-sm text-sand-500">
          {failed
            ? "很抱歉，方案生成出了问题"
            : timedOut
              ? "请稍后刷新查看结果"
              : "AI 正在为你规划专属旅行方案，请稍候..."}
        </p>

        <div className="inline-block text-left">
          <ProgressSteps currentCode={stageCode} failed={failed} />
        </div>

        {errorMessage && (
          <div className="error-banner mt-6">{errorMessage}</div>
        )}

        {(failed || timedOut) && (
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={handleRetry} className="btn-primary">
              重新规划
            </button>
            {timedOut && (
              <button onClick={handleRefresh} className="btn-secondary">
                刷新查看
              </button>
            )}
          </div>
        )}

        {!failed && !timedOut && (
          <p className="mt-8 text-xs text-sand-400">
            通常需要 30-90 秒，请勿关闭页面
          </p>
        )}
      </div>
    </div>
  );
}
