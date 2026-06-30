import { computeSchedule } from "@/utils/schedule";
import { formatMinutes, formatDistance, commuteModeName, cleanBrief } from "@/utils/format";
import { categoryIcon } from "@/constants/places";
import { cityImageList } from "@/components/input/RotatingBackground";
import type { TripPlan, TripResult, TripDay } from "@/types/trip";

const PAGE_W = 794;
const PAGE_H = 1123;
const PAGE_STYLE: React.CSSProperties = {
  width: PAGE_W,
  height: PAGE_H,
  overflow: "hidden",
  position: "relative",
  fontFamily: "system-ui, -apple-system, sans-serif",
  backgroundColor: "#fff",
};

function CoverPage({ result, plan }: { result: TripResult; plan: TripPlan }) {
  const image = cityImageList(result.city.name)[0];
  return (
    <div style={PAGE_STYLE} className="flex flex-col">
      <div className="relative" style={{ height: 560 }}>
        <img src={image} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-12 text-center">
        <img src="/logo.svg" alt="" style={{ width: 40, height: 40 }} crossOrigin="anonymous" />
        <div className="mt-4 text-3xl font-bold text-gray-800">{plan.title}</div>
        <div className="mt-3 text-base text-gray-500">
          {result.city.name} · {result.request.days}天 · {result.request.people_count}人
        </div>
        <div className="mt-6 flex items-center gap-3 text-sm text-gray-400">
          <span>由云途 YunTu AI 智能生成</span>
          <span>·</span>
          <span>kakarot8.com</span>
        </div>
      </div>
    </div>
  );
}

function SummaryPage({ plan }: { plan: TripPlan }) {
  const totalMinutes = plan.pace.total_commute_minutes;
  const paceLabel = plan.pace.level === "RELAXED" ? "轻松悠闲" : plan.pace.level === "INTENSIVE" ? "紧凑充实" : "节奏适中";
  return (
    <div style={PAGE_STYLE} className="flex flex-col px-12 py-14">
      <div className="text-2xl font-bold text-gray-800">行程总览</div>
      <div className="mt-1 h-1 w-12 rounded bg-[#0a8e9a]" />

      <div className="mt-8 text-base leading-relaxed text-gray-600">{plan.summary}</div>

      {plan.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {plan.tags.map((t) => (
            <span key={t} className="rounded-lg bg-[#0a8e9a]/10 px-3 py-1.5 text-sm text-[#0a8e9a]">{t}</span>
          ))}
        </div>
      )}

      <div className="mt-10 grid grid-cols-3 gap-6">
        <StatBox label="行程天数" value={`${plan.days.length} 天`} />
        <StatBox label="总通勤" value={formatMinutes(totalMinutes)} />
        <StatBox label="旅行节奏" value={paceLabel} />
      </div>

      <div className="mt-auto text-center text-xs text-gray-300">云途 YunTu · AI 智能旅行规划</div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4 text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}

function DayPage({ day, dayIndex }: { day: TripDay; dayIndex: number }) {
  const schedule = computeSchedule(day);
  return (
    <div style={PAGE_STYLE} className="flex flex-col px-10 py-10">
      <div className="mb-1 flex items-baseline gap-3">
        <span className="rounded-lg bg-[#0a8e9a] px-3 py-1 text-sm font-bold text-white">Day {dayIndex}</span>
        <span className="text-lg font-bold text-gray-800">{day.title}</span>
      </div>
      {day.narrative && (
        <p className="mb-5 text-sm leading-relaxed text-gray-500">{day.narrative}</p>
      )}

      <div className="flex-1 space-y-1">
        {day.places.map((place, i) => {
          const sc = schedule.get(place.place_id);
          const leg = day.commute_legs.find((l) => l.from_place_id === place.place_id);
          return (
            <div key={place.place_id}>
              {/* 景点 */}
              <div className="flex gap-3 py-2">
                <div className="w-14 shrink-0 text-right text-sm font-medium text-gray-400">
                  {sc?.arrive ?? ""}
                </div>
                <div className="flex flex-col items-center pt-1">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#0a8e9a" }}
                  >
                    {i + 1}
                  </div>
                  {i < day.places.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{place.name}</span>
                    <span className="text-xs text-gray-400">{categoryIcon(place.category)} {place.category}</span>
                  </div>
                  {cleanBrief(place.brief) && (
                    <p className="mt-1 text-xs leading-relaxed text-gray-500 line-clamp-2">{cleanBrief(place.brief)}</p>
                  )}
                  {sc && (
                    <div className="mt-1 text-xs text-gray-400">{sc.arrive} - {sc.leave}</div>
                  )}
                </div>
              </div>
              {/* 通勤段 */}
              {leg && (
                <div className="ml-14 flex items-center gap-2 py-1 pl-9 text-xs text-gray-400">
                  <i className="fa-solid fa-route" aria-hidden="true" />
                  {commuteModeName(leg.mode)} {formatMinutes(leg.duration_minutes)} · {formatDistance(leg.distance_meters)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4 text-center text-xs text-gray-300">云途 YunTu · AI 智能旅行规划</div>
    </div>
  );
}

interface ExportPDFProps {
  result: TripResult;
  plan: TripPlan;
  onReady: (pages: HTMLDivElement[]) => void;
}

export function ExportPDF({ result, plan, onReady }: ExportPDFProps) {
  const pagesRef: HTMLDivElement[] = [];

  const setRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    pagesRef.push(el);
    const totalPages = 2 + plan.days.length;
    if (pagesRef.length === totalPages) {
      requestAnimationFrame(() => onReady([...pagesRef]));
    }
  };

  return (
    <div style={{ position: "fixed", left: -10000, top: 0, zIndex: -1 }}>
      <div ref={setRef}><CoverPage result={result} plan={plan} /></div>
      <div ref={setRef}><SummaryPage plan={plan} /></div>
      {plan.days.map((day) => (
        <div key={day.day} ref={setRef}><DayPage day={day} dayIndex={day.day} /></div>
      ))}
    </div>
  );
}
