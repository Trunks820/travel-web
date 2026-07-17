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
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // 焦点陷阱：Tab 键循环焦点在弹窗内
      if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;

        const focusableElements = panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements);
        if (focusable.length === 0) return;

        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: 如果在第一个元素，跳到最后一个
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab: 如果在最后一个元素，跳到第一个
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
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
  // 简介只用后端真实 summary，不回退 place.brief（brief 是生成期占位脏文案，如"写成咖啡/茶歇休息点"）
  const summary = detail?.summary ?? "";
  const reasons = detail?.top_reasons ?? [];
  const warnings = detail?.warnings ?? [];
  const sourceCount = detail?.source_count ?? 0;
  const mentionCount = detail?.mention_count ?? 0;
  const showCredibility = sourceCount > 0 || mentionCount > 0;
  // 详情已加载完成、但没有任何可展示的增强字段时，提示"暂无更多详情"
  const hasExtra = reasons.length > 0 || warnings.length > 0 || showCredibility || !!detail?.summary;

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed inset-x-0 bottom-0 z-[110] animate-slide-up lg:inset-0 lg:flex lg:items-center lg:justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={place.name}
          tabIndex={-1}
          className="flex w-full flex-col bg-white shadow-2xl max-h-[85vh] overflow-hidden rounded-t-[2rem] outline-none lg:max-w-md lg:rounded-[2rem]"
        >
          <div className="flex-1 overflow-y-auto p-6 sm:p-8" style={{ overscrollBehavior: "contain" }}>
            <div className="mb-8 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sand-100/50 text-2xl shadow-sm">
                  {categoryIcon(typeLabel)}
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900">{place.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {typeLabel}
                    </span>
                    {detail?.district && (
                      <span className="text-xs font-medium text-gray-400">· {detail.district}</span>
                    )}
                    {isAnchorRole(place.role) && (
                      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold tracking-widest text-primary-700">
                        核心景点
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all hover:bg-gray-200 hover:scale-105 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
              >
                <i className="fa-solid fa-times" aria-hidden="true" />
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
              <div className="mb-4 flex items-center gap-3 text-xs text-sand-600">
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

            {/* loading / 无更多详情 */}
            {loading && (
              <div className="mt-8 flex justify-center border-t border-gray-100 pt-8">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-primary-500" aria-hidden="true" />
                  Loading Details
                </p>
              </div>
            )}
            {!loading && !hasExtra && (
              <div className="mt-8 flex justify-center border-t border-gray-100 pt-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
                  End of Details
                </p>
              </div>
            )}
          </div>

          {/* 底部吸顶按钮：坐标改为高德地图链接 */}
          {place.longitude != null && place.latitude != null && (
            <div className="border-t border-gray-100 bg-white p-4 sm:px-8 sm:py-5">
              <a
                href={`https://uri.amap.com/marker?position=${place.longitude},${place.latitude}&name=${encodeURIComponent(place.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sand-100 px-5 py-3.5 text-sm font-bold text-gray-700 transition-colors hover:bg-sand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
              >
                <i className="fa-solid fa-location-arrow text-primary-600" aria-hidden="true" />
                在高德地图中查看路线
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
