import { useEffect, useRef, useState } from "react";
import type { TripPlace, PlaceDetail } from "@/types/trip";
import { categoryIcon, isAnchorRole } from "@/constants/places";
import { fetchPlaceDetail } from "@/services/api";

interface PlaceDetailModalProps {
  place: TripPlace | null;
  onClose: () => void;
}

export function PlaceDetailModal({ place, onClose }: PlaceDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // POI 详情（v0.8.5）：打开时按 place_id 请求；失败局部降级，仍显示基础信息
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!place) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setLoading(true);
    fetchPlaceDetail(place.place_id)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { /* 404/422/失败：静默降级，仅显示基础信息 */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [place]);

  useEffect(() => {
    if (!place) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => panelRef.current?.focus());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [place, onClose]);

  if (!place) return null;

  // 优先用后端详情字段，缺失回退到 TripPlace 基础信息
  const typeLabel = detail?.place_type ?? place.category;
  const summary = detail?.summary || place.brief;
  const reasons = detail?.top_reasons ?? [];
  const warnings = detail?.warnings ?? [];
  const sourceCount = detail?.source_count ?? 0;
  const mentionCount = detail?.mention_count ?? 0;
  const showCredibility = sourceCount > 0 || mentionCount > 0;
  // 详情已加载完成、但没有任何可展示的增强字段时，提示"暂无更多详情"
  const hasExtra = reasons.length > 0 || warnings.length > 0 || showCredibility || !!detail?.summary;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up lg:inset-0 lg:flex lg:items-center lg:justify-center">
        <div
          ref={panelRef}
          role="dialog"
          aria-label={place.name}
          tabIndex={-1}
          className="card max-h-[85vh] overflow-y-auto rounded-t-3xl outline-none lg:max-w-lg lg:rounded-3xl"
          style={{ overscrollBehavior: "contain" }}
        >
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryIcon(typeLabel)}</span>
                <div>
                  <h2 className="font-display text-xl font-bold text-primary-800">{place.name}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-sand-500">
                    <span>{typeLabel}</span>
                    {detail?.district && (
                      <span className="text-sand-400">· {detail.district}</span>
                    )}
                    {isAnchorRole(place.role) && (
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[11px] text-primary-600">
                        核心景点
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="rounded-lg p-2 text-sand-400 transition-colors hover:bg-sand-100 hover:text-sand-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* 简介 */}
            {summary && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-primary-800">简介</h3>
                <p className="text-sm leading-relaxed text-sand-600">{summary}</p>
              </div>
            )}

            {/* 推荐理由 */}
            {reasons.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-primary-800">推荐理由</h3>
                <ul className="space-y-1.5">
                  {reasons.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm text-sand-600">
                      <i className="fa-solid fa-check mt-0.5 shrink-0 text-xs text-primary-500" aria-hidden="true" />
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 注意事项（橙色提醒条，与天气提醒统一） */}
            {warnings.length > 0 && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-accent-100 bg-accent-50 px-3 py-2.5">
                <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0 text-xs text-accent-500" aria-hidden="true" />
                <div className="space-y-1">
                  {warnings.map((w) => (
                    <p key={w} className="text-[13px] leading-relaxed text-accent-700">{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* 可信度/热度 */}
            {showCredibility && (
              <div className="mb-4 flex items-center gap-3 text-xs text-sand-500">
                {sourceCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-solid fa-layer-group text-primary-400" aria-hidden="true" />
                    综合 {sourceCount} 个来源
                  </span>
                )}
                {mentionCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-solid fa-comment-dots text-primary-400" aria-hidden="true" />
                    {mentionCount} 次提及
                  </span>
                )}
              </div>
            )}

            {/* 坐标 */}
            {place.longitude != null && place.latitude != null && (
              <div className="flex items-center gap-1.5 text-xs text-sand-400">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
              </div>
            )}

            {/* loading / 无更多详情 */}
            {loading && (
              <p className="mt-4 flex items-center gap-2 border-t border-primary-50 pt-3 text-[11px] text-sand-400">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> 正在加载详情…
              </p>
            )}
            {!loading && !hasExtra && (
              <p className="mt-4 border-t border-primary-50 pt-3 text-[11px] text-sand-400">
                暂无更多详情
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
