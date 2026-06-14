import type { WeatherData } from "@/services/mockBudget";

interface WeatherCardProps {
  data: WeatherData;
}

export function WeatherCard({ data }: WeatherCardProps) {
  const { city, current, days } = data;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">{city}天气预报</h2>
        <span className="text-[11px] text-gray-400">未来 {days.length} 天</span>
      </div>

      <div className="mb-6 flex items-center gap-5">
        <div className="text-[40px] leading-none drop-shadow-sm">{current.icon}</div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-800">{current.temp}°</span>
            <span className="text-xs font-medium text-gray-600">{current.desc}</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            湿度 {current.humidity}% | {current.wind}
          </div>
        </div>
      </div>

      <div className="flex justify-between text-center">
        {days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-0.5">
            <div className="mb-0.5 text-xs font-medium text-gray-700">{d.dayLabel}</div>
            <div className="mb-1 text-[10px] text-gray-400">{d.date}</div>
            <div className="my-1 text-lg leading-none">{d.icon}</div>
            <div className="mt-1 text-xs font-bold text-gray-800">{d.high}°</div>
            <div className="mt-0.5 text-[11px] text-gray-400">{d.low}°</div>
          </div>
        ))}
      </div>
    </div>
  );
}
