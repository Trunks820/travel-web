import { SUPPORTED_CITIES } from "@/constants/preferences";

interface MultiCitySelectProps {
  value: string[];
  onChange: (cities: string[]) => void;
  error?: string;
}

const HOT_CITIES = ["大阪", "北海道", "冲绳", "首尔", "台北", "新加坡"];

export function MultiCitySelect({ value, onChange, error }: MultiCitySelectProps) {
  function addCity(city: string) {
    if (!value.includes(city)) {
      onChange([...value, city]);
    }
  }

  function removeCity(city: string) {
    onChange(value.filter((c) => c !== city));
  }

  return (
    <div className="space-y-2.5">
      {/* 已选城市芯片 */}
      <div className="flex flex-wrap items-center gap-2">
        {value.map((city, idx) => (
          <div
            key={city}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
              idx === 0
                ? 'bg-[#008080] text-white'
                : 'bg-[#f0f9f9] text-gray-700 border border-[#e0f2f2]'
            }`}
          >
            <span>{city}</span>
            <button
              type="button"
              onClick={() => removeCity(city)}
              className={`text-xs transition-opacity ${
                idx === 0 ? 'opacity-80 hover:opacity-100' : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label={`移除 ${city}`}
            >
              ✕
            </button>
          </div>
        ))}
        {value.length < 5 && (
          <button
            type="button"
            className="flex items-center px-4 py-2 rounded-lg text-sm border border-dashed border-gray-300 text-gray-400 hover:border-teal-500 hover:text-teal-500 transition-colors"
          >
            + 添加城市
          </button>
        )}
      </div>

      {/* 热门目的地快选 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400">热门目的地：</span>
        {(HOT_CITIES.length > 0 ? HOT_CITIES : SUPPORTED_CITIES.slice(0, 6))
          .filter((c) => !value.includes(c))
          .map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => addCity(city)}
              className="rounded-md bg-gray-50 border border-gray-150 px-2.5 py-1 text-xs text-gray-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50/50 transition-colors"
            >
              {city}
            </button>
          ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
