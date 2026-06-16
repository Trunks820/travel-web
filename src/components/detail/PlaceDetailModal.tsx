import { useEffect, useRef } from "react";
import type { TripPlace } from "@/types/trip";
import { categoryIcon, isAnchorRole } from "@/constants/places";

interface PlaceDetailModalProps {
  place: TripPlace | null;
  onClose: () => void;
}

export function PlaceDetailModal({ place, onClose }: PlaceDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
        >
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryIcon(place.category)}</span>
                <div>
                  <h2 className="font-display text-xl font-bold text-primary-800">{place.name}</h2>
                  <p className="mt-1 text-sm text-sand-500">
                    {place.category}
                    {isAnchorRole(place.role) && (
                      <span className="ml-2 rounded bg-primary-50 px-1.5 py-0.5 text-[11px] text-primary-600">
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

            {place.brief && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-primary-800">简介</h3>
                <p className="text-sm leading-relaxed text-sand-600">{place.brief}</p>
              </div>
            )}

            {place.longitude != null && place.latitude != null && (
              <div className="flex items-center gap-1.5 text-xs text-sand-400">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
              </div>
            )}

            <p className="mt-4 border-t border-primary-50 pt-3 text-[11px] text-sand-400">
              更多详情（开放时间、门票、实拍图）即将上线
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
