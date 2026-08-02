import type { TripDay, TripWeather, WeatherDay } from "@/types/trip";
import { weatherFaIcon, collectWeatherReminders } from "@/constants/weather";

interface TripSpineProps {
  days: TripDay[];
  weather?: TripWeather | null;
  activeDay: number;
  onDayClick?: (dayNumber: number) => void;
}

export function TripSpine({ days, weather, activeDay, onDayClick }: TripSpineProps) {
  const weatherDays = weather?.status === "ok" ? weather.days : [];
  const reminders = collectWeatherReminders(weatherDays);

  return (
    <nav
      aria-label="每日行程导航"
      className="hidden w-48 shrink-0 self-start xl:block transition-opacity duration-300"
    >
      <div className="max-h-[calc(100vh-7rem)] overflow-y-auto hide-scrollbar overscroll-contain pr-2 space-y-5">
        {/* 标题说明 */}
        <div className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-widest text-gray-600">
          <i className="fas fa-list-ol text-primary-500 text-[11px]" aria-hidden="true" />
          <span>行程脊柱</span>
        </div>

        {/* 节点竖轴线 */}
        <div className="relative pl-4 space-y-6 border-l-2 border-gray-200/90 ml-1.5">
          {days.map((d: TripDay) => {
            const dayNum = d.day;
            const isActive = activeDay === dayNum;
            const isPassed = activeDay > dayNum;
            const w = weatherDays.find((wd: WeatherDay) => wd.day === dayNum);
            const faIcon = w ? weatherFaIcon(w.icon_code) : null;

            return (
              <div key={dayNum} className="relative flex items-center group">
                {/* 节点指示圈 */}
                <div
                  className={`absolute -left-[21px] h-3.5 w-3.5 rounded-full border-2 bg-white transition-all duration-200 ${
                    isActive
                      ? "border-primary-600 ring-4 ring-primary-100 scale-125 bg-primary-600"
                      : isPassed
                      ? "border-primary-500 bg-primary-500"
                      : "border-gray-300 group-hover:border-gray-400"
                  }`}
                />

                <a
                  href={`#day-${dayNum}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    if (onDayClick) {
                      e.preventDefault();
                      onDayClick(dayNum);
                    }
                  }}
                  className={`flex items-center gap-2.5 font-display transition-all ${
                    isActive
                      ? "text-primary-700 font-extrabold scale-105"
                      : "text-gray-600 hover:text-gray-900 font-bold"
                  }`}
                >
                  <span className="text-sm tracking-wider">
                    {String(dayNum).padStart(2, "0")}
                  </span>
                  {w && (
                    <span className={`flex items-center gap-1 text-xs font-medium tabular-nums ${
                      isActive ? "text-primary-700" : "text-gray-500"
                    }`}>
                      <i className={`fas ${faIcon} text-xs ${isActive ? "text-primary-600" : "text-gray-400"}`} aria-hidden="true" />
                      <span>{w.temp_max_c}°C</span>
                    </span>
                  )}
                </a>
              </div>
            );
          })}
        </div>

        {/* 脊柱底部聚合提醒 */}
        {reminders.length > 0 && (
          <div className="mt-5 border-t border-gray-200/60 pt-4">
            <div className="rounded-xl bg-amber-50/90 p-3 text-xs text-amber-900 border border-amber-200/70 shadow-2xs leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <i className="fas fa-exclamation-triangle text-amber-600 text-xs" aria-hidden="true" />
                <span>气象提醒</span>
              </div>
              {reminders.map((rem: string, i: number) => (
                <p key={i} className="line-clamp-3 text-[11px] leading-normal">{rem}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
