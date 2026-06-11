import type { TripPlace } from "@/types/trip";

interface PlaceItemProps {
  place: TripPlace;
  index: number;
  isActive?: boolean;
  isLast?: boolean;
  onClick?: () => void;
}

const CATEGORY_ICON: Record<string, string> = {
  landmark: "🏛️",
  food: "🍜",
  scenic: "🌿",
  culture: "🎭",
  shopping: "🛍️",
  nightlife: "🌃",
};

export function PlaceItem({ place, index, isActive, isLast, onClick }: PlaceItemProps) {
  return (
    <div
      onClick={onClick}
      className={`relative flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all duration-150 ${
        isActive
          ? "bg-primary-50 ring-1 ring-primary-200"
          : "hover:bg-primary-50/50"
      }`}
    >
      {/* 时间轴圆点 */}
      <div className="relative flex flex-col items-center">
        <span
          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${
            place.role === "anchor"
              ? "bg-gradient-to-br from-primary-500 to-primary-600"
              : "bg-sand-400"
          }`}
        >
          {index + 1}
        </span>
        {!isLast && (
          <div className="absolute top-8 h-[calc(100%+4px)] w-px bg-primary-100" />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{CATEGORY_ICON[place.category] ?? "📍"}</span>
          <span className="truncate text-sm font-semibold text-primary-800">
            {place.name}
          </span>
          {place.optional && (
            <span className="shrink-0 rounded-md bg-sand-100 px-1.5 py-0.5 text-[10px] text-sand-500">
              可选
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-sand-500">
          {place.brief}
        </p>
        {place.stay_minutes && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary-500">
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></svg>
            约 {place.stay_minutes} 分钟
          </span>
        )}
      </div>
    </div>
  );
}
