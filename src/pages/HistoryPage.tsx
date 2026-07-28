import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { getHistoryTrips, submitTrip, ApiRequestError } from "@/services/api";
import { useTripStore } from "@/stores/tripStore";
import { useAuthStore } from "@/stores/authStore";
import type { HistoryTripItem } from "@/types/auth";

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return isoString;
  }
}

function formatRemainingDays(expiresAtIso: string): string {
  try {
    const expiresMs = new Date(expiresAtIso).getTime();
    const nowMs = Date.now();
    const diffHours = Math.max(0, Math.floor((expiresMs - nowMs) / (1000 * 3600)));
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    if (days > 0) return `剩余 ${days} 天 ${hours} 小时归档`;
    if (hours > 0) return `剩余 ${hours} 小时归档`;
    return "即将归档";
  } catch {
    return "7天内有效";
  }
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const setFormData = useTripStore((s) => s.setFormData);
  const clearResult = useTripStore((s) => s.clearResult);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [items, setItems] = useState<HistoryTripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingTripId, setRetryingTripId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current || loading || items.length === 0) return;
    const cards = listRef.current.children;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 24, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
        clearProps: "transform,opacity",
      },
    );
  }, [loading, items]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getHistoryTrips()
      .then((res) => {
        if (!cancelled && res.ok) {
          setItems(res.items || []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof ApiRequestError ? err.message : "获取历史行程失败";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetryInput = async (item: HistoryTripItem) => {
    if (!item.retry_input?.trip_request || retryingTripId) return;

    const requestData = item.retry_input.trip_request;
    setRetryingTripId(item.trip_id);

    setFormData(requestData);
    clearResult();

    const newRequestId = `web-${crypto.randomUUID()}`;
    try {
      const res = await submitTrip(requestData, newRequestId);
      void refreshMe();
      navigate(`/planning/${res.job_id}`);
    } catch (err: unknown) {
      const msg = err instanceof ApiRequestError ? err.message : "发起重试失败，请稍后再试";
      alert(msg);
      setRetryingTripId(null);
    }
  };

  return (
    <div className="min-h-screen bg-sand-50 pb-16 pt-6">
      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-800 sm:text-3xl">
              我的行程
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              近 7 天内生成的旅行规划与草稿记录
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="self-start rounded-full bg-accent-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-accent-600 sm:self-auto"
          >
            + 定制新行程
          </button>
        </div>

        {/* Notice Banner */}
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-primary-100 bg-primary-50/80 px-4 py-3 text-xs text-primary-800">
          <i className="fas fa-circle-info text-primary-500" aria-hidden="true" />
          <span>
            提示：行程记录生成后将在 <strong>7 天内保留展示</strong>
            ，超时后自动归档。
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-200 border-t-primary-500" />
            <p className="text-sm text-gray-400">正在加载历史行程…</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
            <p className="mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-red-300 bg-white px-4 py-1.5 text-xs font-medium text-red-700"
            >
              重新加载
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
            <span className="text-4xl">🗺️</span>
            <h2 className="mt-4 text-base font-bold text-gray-700">暂无历史行程</h2>
            <p className="mt-1.5 max-w-xs text-xs text-gray-400">
              你还没有生成过旅行路书。告诉我们你的需求，快速为你打造专属行程！
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 rounded-2xl bg-accent-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent-200 hover:bg-accent-600"
            >
              立即定制专属路书
            </button>
          </div>
        )}

        {/* Card List */}
        {!loading && !error && items.length > 0 && (
          <div ref={listRef} className="space-y-4">
            {items.map((item) => {
              const isSuccess = item.status === "SUCCESS";
              const isRetrying = retryingTripId === item.trip_id;

              return (
                <div
                  key={item.trip_id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-primary-100 hover:shadow-md"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      {/* Title & Tags */}
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-bold text-gray-800">
                          {item.city} <span className="text-sm font-medium text-gray-500">· {item.days}天行程</span>
                        </h2>

                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <i className="fas fa-check text-[10px]" /> 已生成
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                            <i className="fas fa-xmark text-[10px]" /> 未完成
                          </span>
                        )}

                        {!isSuccess && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                            ✓ 额度已退还
                          </span>
                        )}
                      </div>

                      {/* Timeline & Metadata */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span>提交时间: {formatDateTime(item.created_at)}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-amber-600 font-medium">
                          {formatRemainingDays(item.expires_from_history_at)}
                        </span>
                      </div>

                      {/* Error Message for Failure */}
                      {!isSuccess && item.error?.message && (
                        <p className="mt-2.5 text-xs text-red-600">
                          原因说明: {item.error.message}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {isSuccess && item.result_record_id ? (
                        <button
                          onClick={() =>
                            navigate(
                              `/result/${item.result_record_id}?job_id=${encodeURIComponent(item.job_id)}`,
                            )
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-primary-50 px-4 py-2 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100"
                        >
                          <span>查看路书</span>
                          <i className="fas fa-chevron-right text-[10px]" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRetryInput(item)}
                          disabled={isRetrying}
                          className="flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
                        >
                          {isRetrying ? (
                            <>
                              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              <span>提交中...</span>
                            </>
                          ) : (
                            <>
                              <i className="fas fa-rotate-right text-[10px]" />
                              <span>用原参数重试</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Retention Policy Statement (No single item delete button) */}
        <footer className="mt-12 text-center text-xs text-gray-600">
          <p>
            v0.1 不提供单条行程删除。账号注销会删除登录身份和会话，并解除历史行程与账号的关联；去标识化的行程内容和质量数据将继续保留。
          </p>
        </footer>
      </main>
    </div>
  );
}
