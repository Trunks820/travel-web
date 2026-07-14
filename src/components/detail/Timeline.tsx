import { useEffect, useState, type CSSProperties } from "react";
import type { TripDay, TripPlace } from "@/types/trip";
import { categoryIcon, isAnchorRole } from "@/constants/places";
import { commuteModeName, commuteModeIcon, formatMinutes, formatDistance, cleanBrief } from "@/utils/format";
import { periodLabel, governedExactTime, exactTimeSourceLabel } from "@/utils/schedule";

interface TimelineProps {
  day: TripDay;
  activePlaceId?: number | null;
  onPlaceClick?: (place: TripPlace) => void;
}

/** 时段徽标配色：一天内的视觉节奏由浅入深 */
const PERIOD_BADGE_CLASS: Record<string, string> = {
  上午: "bg-amber-50 text-amber-600",
  下午: "bg-sky-50 text-sky-600",
  傍晚: "bg-orange-50 text-orange-600",
  晚上: "bg-indigo-50 text-indigo-600",
};

/** md 及以上默认展开攻略；手机默认折叠。切 Day 时按当前断点重置。 */
function useDesktopOpenDefault(dayKey: number) {
  const [open, setOpen] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true,
  );

  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 768px)").matches);
  }, [dayKey]);

  return [open, setOpen] as const;
}

export function Timeline({ day, activePlaceId, onPlaceClick }: TimelineProps) {
  const [narrativeOpen, setNarrativeOpen] = useDesktopOpenDefault(day.day);

  return (
    <div className="px-5 py-5">
      <div className="stagger relative space-y-1">
        {day.places.map((place, i) => {
          const leg = day.commute_legs.find((l) => l.from_place_id === place.place_id);
          const anchor = isAnchorRole(place.role);
          const isActive = activePlaceId === place.place_id;
          // 时段与精确时间只来自后端 schedule；1.4 结果无此字段则不显示任何时间
          const period = periodLabel(place.schedule?.period);
          const exact = governedExactTime(place.schedule);
          const note = cleanBrief(place.activity_note);
          const brief = cleanBrief(place.brief);

          return (
            <div key={place.place_id} style={{ "--i": i } as CSSProperties}>
              <div className="flex gap-4">
                {/* 时段列（后端 period；无 schedule 的旧结果留白） */}
                <div className="w-12 shrink-0 pt-2.5 text-right">
                  {period && (
                    <span
                      data-testid="period-badge"
                      className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                        PERIOD_BADGE_CLASS[period] ?? "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {period}
                    </span>
                  )}
                </div>

                {/* 节点 */}
                <div className="relative shrink-0 pt-2.5">
                  {/* 连线：从本圆点底部连到下一项圆点（最后一项不画，避免溢出到正文） */}
                  {i < day.places.length - 1 && (
                    <div
                      className="absolute left-1/2 top-[34px] -bottom-1 w-px -translate-x-1/2 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
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
                  className={`flex-1 rounded-xl border bg-white p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${
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

                  {/* 精确时间：仅受治理来源（reservation/event/transport/verified_venue_rule） */}
                  {exact && (
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-gray-600 tabular-nums">
                      <i className="fa-regular fa-clock" aria-hidden="true" />
                      {exact.text}
                      <span className="rounded bg-primary-50 px-1 py-0.5 text-[10px] font-normal text-primary-600">
                        {exactTimeSourceLabel(exact.source)}
                      </span>
                    </div>
                  )}

                  {/* activity_note：本条路线中该地点的体验说明（1.5）；旧结果回退 brief */}
                  {note ? (
                    <p className="text-[12px] leading-relaxed text-gray-600">{note}</p>
                  ) : (
                    brief && (
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-600">
                        {brief}
                      </p>
                    )
                  )}
                </button>
              </div>

              {/* 通勤段：线路/站点/换乘/耗时只在这里展示 */}
              {leg && (
                <div className="flex gap-4 py-1.5">
                  <div className="w-12 shrink-0" />
                  <div className="w-6 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <div className="flex w-fit items-center gap-2 rounded-md border border-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 tabular-nums" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                      <i className={`fa-solid ${commuteModeIcon(leg.mode)} text-[10px] text-gray-400`} aria-hidden="true" />
                      {commuteModeName(leg.mode)} {formatMinutes(leg.duration_minutes)}
                      <span className="text-gray-300">|</span>
                      {formatDistance(leg.distance_meters)}
                    </div>
                    {leg.mode === "transit" && (leg.transit_steps?.length ? (
                      <div className="max-w-[280px] space-y-1">
                        {leg.transit_steps.map((step, si) => (
                          <p key={si} className="text-[10px] leading-relaxed text-gray-500">
                            {step.kind === "bus" || step.kind === "rail" ? (
                              <>
                                <span className="font-medium text-gray-600">{step.line_name ?? commuteModeName(step.kind)}</span>
                                {step.from_stop && step.to_stop && (
                                  <span> · {step.from_stop} → {step.to_stop}</span>
                                )}
                                {step.stop_count != null && <span>（{step.stop_count}站）</span>}
                                {step.duration_minutes != null && (
                                  <span> {formatMinutes(step.duration_minutes)}</span>
                                )}
                              </>
                            ) : (
                              <>
                                {step.kind === "walking" ? "步行" : "换乘"}
                                {step.duration_minutes != null && ` ${formatMinutes(step.duration_minutes)}`}
                                {step.distance_meters != null && ` ${formatDistance(step.distance_meters)}`}
                              </>
                            )}
                          </p>
                        ))}
                      </div>
                    ) : leg.transit_summary ? (
                      // provider 降级：展示后端提供的通用通勤提示
                      <p className="max-w-[260px] text-[10px] leading-relaxed text-gray-400">
                        {leg.transit_summary}
                      </p>
                    ) : null)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 当日攻略正文：时间轴之后，不改写内容；手机默认折叠、桌面默认展开 */}
      {day.narrative && (
        <div className="mt-6 rounded-2xl bg-amber-50/60 p-4 border border-amber-100/50">
          <button
            type="button"
            onClick={() => setNarrativeOpen((v) => !v)}
            className="flex w-full min-h-[44px] py-2 items-center justify-between gap-2 text-left md:pointer-events-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-expanded={narrativeOpen}
          >
            <span className="text-[14px] font-bold text-amber-800 flex items-center gap-2">
              <i className="fa-regular fa-lightbulb text-amber-500 text-lg" aria-hidden="true" />
              {narrativeOpen ? "当日游玩贴士" : "查看当日游玩贴士"}
            </span>
            <i
              className={`fa-solid fa-chevron-down text-[12px] text-amber-500 transition-transform md:hidden ${
                narrativeOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>
          {narrativeOpen && (
            <div className="mt-3 text-[13px] leading-relaxed text-amber-900/80">
              {day.narrative.split('\n').map((line, idx) => (
                <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 当日通勤小结 */}
      {day.commute_summary && (
        <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-3.5 flex items-start gap-2.5 text-xs text-gray-500">
          <i className="fa-solid fa-car-side mt-0.5 text-gray-400" aria-hidden="true" />
          <p className="leading-relaxed">{day.commute_summary}</p>
        </div>
      )}
    </div>
  );
}
