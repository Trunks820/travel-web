import type { TripDay, TripPlace } from "@/types/trip";
import { categoryIcon, isAnchorRole } from "@/constants/places";
import { commuteModeName, formatMinutes, formatDistance } from "@/utils/format";
import { computeSchedule } from "@/utils/schedule";

interface TimelineProps {
  day: TripDay;
  activePlaceId?: number | null;
  onPlaceClick?: (place: TripPlace) => void;
}

const MODE_ICON: Record<string, string> = {
  walking: "fa-person-walking",
  transit: "fa-bus",
  taxi: "fa-car",
};

export function Timeline({ day, activePlaceId, onPlaceClick }: TimelineProps) {
  const schedule = computeSchedule(day);

  return (
    <div className="relative px-5 py-5">
      {/* 连接竖线 */}
      <div className="absolute left-[86px] top-10 bottom-10 w-px bg-gray-200" aria-hidden="true" />

      <div className="relative space-y-1">
        {day.places.map((place, i) => {
          const sched = schedule.get(place.place_id);
          const leg = day.commute_legs.find((l) => l.from_place_id === place.place_id);
          const anchor = isAnchorRole(place.role);
          const isActive = activePlaceId === place.place_id;

          return (
            <div key={place.place_id}>
              <div className="flex gap-4">
                {/* 时刻列 */}
                <div className="w-12 shrink-0 pt-2.5 text-right text-[13px] font-medium text-gray-500">
                  {sched?.arrive ?? ""}
                </div>

                {/* 节点 */}
                <div className="relative shrink-0 pt-2.5">
                  <div
                    className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${
                      anchor ? "bg-primary-600" : "bg-accent-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* 内容卡（纯文字，无景点图） */}
                <button
                  type="button"
                  onClick={() => onPlaceClick?.(place)}
                  className={`flex-1 rounded-xl border bg-white p-3.5 text-left transition-all hover:shadow-md ${
                    isActive
                      ? "border-primary-300 shadow-[0_2px_12px_rgba(15,118,110,0.12)] ring-1 ring-primary-200"
                      : "border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-base">{categoryIcon(place.category)}</span>
                      <h3 className="truncate font-bold text-gray-800">{place.name}</h3>
                    </div>
                    {place.optional && (
                      <span className="shrink-0 rounded bg-sand-100 px-1.5 py-0.5 text-[10px] text-sand-500">
                        可选
                      </span>
                    )}
                  </div>

                  {sched && (
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                      <i className="fa-regular fa-clock" aria-hidden="true" />
                      {sched.arrive} - {sched.leave}
                    </div>
                  )}

                  {place.brief && (
                    <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                      {place.brief}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-600">
                      {place.category}
                    </span>
                  </div>
                </button>
              </div>

              {/* 通勤段 */}
              {leg && (
                <div className="flex gap-4 py-1.5">
                  <div className="w-12 shrink-0" />
                  <div className="w-6 shrink-0" />
                  <div className="flex w-fit items-center gap-2 rounded-md border border-gray-100 bg-[#f8f9fa] px-2.5 py-1.5 text-[11px] font-medium text-gray-500">
                    <i className={`fa-solid ${MODE_ICON[leg.mode] ?? "fa-route"} text-[10px] text-gray-400`} aria-hidden="true" />
                    {commuteModeName(leg.mode)} {formatMinutes(leg.duration_minutes)}
                    <span className="text-gray-300">|</span>
                    {formatDistance(leg.distance_meters)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 当日通勤小结 + 叙述 */}
      {day.commute_summary && (
        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">{day.commute_summary}</p>
      )}
      {day.narrative && (
        <p className="mt-3 rounded-xl bg-primary-50/50 p-3.5 text-[13px] leading-relaxed text-primary-700">
          {day.narrative}
        </p>
      )}
    </div>
  );
}
